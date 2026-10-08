from __future__ import annotations
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
import hashlib, math, random
from typing import Any
from arcengine import FrameData, GameAction, GameState
from agents.agent import Agent

@dataclass
class Stat:
    visits:int=0
    total_reward:float=0.0
    deaths:int=0
    self_loops:int=0
    @property
    def mean(self)->float:
        return self.total_reward/self.visits if self.visits else 0.0

def _rows(frame):
    if not frame: return []
    return [list(map(int,row)) for row in frame if row is not None]

def frame_fingerprint(frame, levels_completed=0):
    rows=_rows(frame); h=hashlib.blake2b(digest_size=12); h.update(int(levels_completed).to_bytes(2,'little',signed=False))
    if not rows: h.update(b'empty'); return h.hexdigest()
    h.update(len(rows).to_bytes(2,'little')); h.update(max((len(r) for r in rows),default=0).to_bytes(2,'little'))
    for row in rows: h.update(bytes((v & 0xFF) for v in row)); h.update(b'\xff')
    return h.hexdigest()

def frame_change_ratio(a,b):
    ra,rb=_rows(a),_rows(b)
    if not ra or not rb: return 1.0 if ra != rb else 0.0
    h=min(len(ra),len(rb)); w=min(min((len(r) for r in ra[:h]),default=0),min((len(r) for r in rb[:h]),default=0))
    if h<=0 or w<=0: return 0.0
    changed=sum(1 for y in range(h) for x in range(w) if ra[y][x]!=rb[y][x])
    return changed/float(h*w)

def _connected_components(rows,color):
    if not rows:return []
    H=len(rows); W=min((len(r) for r in rows),default=0); seen=set(); out=[]
    for y in range(H):
        for x in range(W):
            if (x,y) in seen or rows[y][x]!=color: continue
            q=[(x,y)]; seen.add((x,y)); comp=[]
            while q:
                cx,cy=q.pop(); comp.append((cx,cy))
                for nx,ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1)):
                    if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and rows[ny][nx]==color:
                        seen.add((nx,ny)); q.append((nx,ny))
            out.append(comp)
    return out

def salient_clicks(frame,limit=14):
    rows=_rows(frame)
    if not rows:return [(32,32)]
    H=len(rows); W=min((len(r) for r in rows),default=0)
    if W<=0:return [(32,32)]
    counts=Counter(v for row in rows for v in row[:W]); background=counts.most_common(1)[0][0]; ranked=[]
    for color,count in counts.items():
        if color==background: continue
        for comp in _connected_components(rows,color):
            if not comp: continue
            size=len(comp)
            if size>(W*H)*0.30: continue
            xs=[p[0] for p in comp]; ys=[p[1] for p in comp]; touches=any(x in (0,W-1) or y in (0,H-1) for x,y in comp)
            edge_fraction=size/max(1,2*W+2*H-4); cx=round(sum(xs)/size); cy=round(sum(ys)/size)
            score=8.0/max(1,count)+1.2/math.sqrt(size)-(0.35 if touches and edge_fraction>0.20 else 0.0)+color*1e-4
            ranked.append((score,cx,cy,color))
    ranked.sort(key=lambda t:(-t[0],-t[3],t[1],t[2])); clicks=[]
    for _,x,y,_ in ranked:
        p=(max(0,min(63,x)),max(0,min(63,y)))
        if p not in clicks: clicks.append(p)
        if len(clicks)>=limit: break
    for p in ((32,32),(8,8),(55,8),(8,55),(55,55),(32,8),(32,55),(8,32),(55,32)):
        if p not in clicks: clicks.append(p)
        if len(clicks)>=limit: break
    return clicks or [(32,32)]

class MyAgent(Agent):
    MAX_ACTIONS=140
    def __init__(self,*args:Any,**kwargs:Any)->None:
        super().__init__(*args,**kwargs)
        seed=int(hashlib.blake2b(str(self.game_id).encode(),digest_size=8).hexdigest(),16)
        self.rng=random.Random(seed); self.stats=defaultdict(Stat); self.state_visits=Counter(); self.pending=None; self.pending_frame=None; self.pending_levels=0; self.recent_states=deque(maxlen=10); self.best_levels=0
    @property
    def name(self): return f'{super().name}.adaptive-v1'
    def is_done(self,frames,latest_frame): return latest_frame.state is GameState.WIN
    def _available_actions(self,latest_frame):
        raw=getattr(latest_frame,'available_actions',None); actions=[]
        if raw:
            for item in raw:
                try:
                    ident=int(getattr(item,'id',item)); a=GameAction.from_id(ident)
                    if a is not GameAction.RESET: actions.append(a)
                except Exception: continue
        if not actions: actions=[a for a in GameAction if a is not GameAction.RESET]
        out=[]
        for a in actions:
            if a not in out: out.append(a)
        return out
    def _update_previous(self,latest_frame,current_key):
        if self.pending is None:return
        prev_state,action_key=self.pending; stat=self.stats[(prev_state,action_key)]; stat.visits+=1
        level_delta=int(latest_frame.levels_completed or 0)-self.pending_levels; reward=100.0*max(0,level_delta)
        if latest_frame.state is GameState.WIN: reward+=250.0
        if latest_frame.state is GameState.GAME_OVER: reward-=30.0; stat.deaths+=1
        reward+=6.0*frame_change_ratio(self.pending_frame,latest_frame.frame)
        if current_key==prev_state: reward-=2.5; stat.self_loops+=1
        elif self.state_visits[current_key]==0: reward+=3.0
        stat.total_reward+=reward; self.pending=None
    def _options(self,latest_frame,state_key):
        options=[]
        for action in self._available_actions(latest_frame):
            if action.is_complex():
                for x,y in salient_clicks(latest_frame.frame): options.append((action,{'x':x,'y':y},f'{action.value}@{x},{y}'))
            else: options.append((action,None,str(action.value)))
        return options
    def _score_option(self,state_key,action_key):
        stat=self.stats[(state_key,action_key)]; total=max(1,self.state_visits[state_key])
        if stat.visits==0:return 20.0+self.rng.random()*0.25
        ucb=2.2*math.sqrt(math.log(total+2.0)/stat.visits); death=8.0*stat.deaths/stat.visits; loop=3.0*stat.self_loops/stat.visits
        return stat.mean+ucb-death-loop
    def choose_action(self,frames,latest_frame):
        if latest_frame.state in (GameState.NOT_PLAYED,GameState.GAME_OVER):
            if latest_frame.state is GameState.GAME_OVER:
                current_key=frame_fingerprint(latest_frame.frame,int(latest_frame.levels_completed or 0)); self._update_previous(latest_frame,current_key)
            reset=GameAction.RESET; reset.reasoning={'policy':'reset-after-not-played-or-game-over'}; self.pending=None; self.pending_frame=None; return reset
        levels=int(latest_frame.levels_completed or 0); state_key=frame_fingerprint(latest_frame.frame,levels); self._update_previous(latest_frame,state_key); self.state_visits[state_key]+=1; self.recent_states.append(state_key); self.best_levels=max(self.best_levels,levels)
        options=self._options(latest_frame,state_key)
        if not options:
            reset=GameAction.RESET; reset.reasoning={'policy':'no-legal-options'}; return reset
        scored=[(self._score_option(state_key,key),action,data,key) for action,data,key in options]; scored.sort(key=lambda t:t[0],reverse=True); score,action,data,action_key=scored[0]
        if data is not None: action.set_data(data)
        stat=self.stats[(state_key,action_key)]; action.reasoning={'policy':'adaptive-ucb','state_visits':self.state_visits[state_key],'action_visits':stat.visits,'estimated_value':round(stat.mean,4),'selection_score':round(score,4),'levels_completed':levels,'best_levels':self.best_levels}
        self.pending=(state_key,action_key); self.pending_frame=[row[:] for row in _rows(latest_frame.frame)]; self.pending_levels=levels; return action
