from __future__ import annotations
import argparse,csv,hashlib,json,math,os,re,shutil
from pathlib import Path
from typing import Any
import yaml
import cadquery as cq
from cadquery import exporters

ATTR=re.compile(r"attribute\s+(\w+)\s*:\s*(\w+)\s*=\s*([^;]+);",re.I)
PART=re.compile(r"part\s+def\s+(\w+)",re.I)

def sha256_file(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def load_manifest(path:str|Path)->dict[str,Any]:
    path=Path(path).resolve(); data=yaml.safe_load(path.read_text()); base=path.parent; sources={}
    for key,rel in data['sources'].items():
        p=(base/rel).resolve()
        if not p.exists(): raise FileNotFoundError(f'Missing source {key}: {p}')
        sources[key]={'path':str(p),'sha256':sha256_file(p),'bytes':p.stat().st_size}
    return {'name':data['name'],'sources':sources,'target':data.get('target','browser')}

def parse_sysml(path:str|Path)->dict[str,Any]:
    text=Path(path).read_text(); part=PART.search(text); attrs={}; types={}
    for name,typ,raw in ATTR.findall(text):
        raw=raw.strip()
        if raw.lower() in {'true','false'}: value=raw.lower()=='true'
        else:
            try: value=float(raw) if '.' in raw else int(raw)
            except ValueError: value=raw.strip('"')
        attrs[name]=value; types[name]=typ
    return {'part_definition':part.group(1) if part else None,'attributes':attrs,'types':types}

def process_step(step_path:str|Path,out_dir:str|Path)->dict[str,Any]:
    out=Path(out_dir); out.mkdir(parents=True,exist_ok=True)
    model=cq.importers.importStep(str(step_path)); solid=model.val(); bb=solid.BoundingBox(); mesh=out/'asset.stl'
    exporters.export(model,str(mesh),tolerance=0.2,angularTolerance=0.2)
    return {'source_step':str(step_path),'mesh':str(mesh),'bounds_mm':{'x':bb.xlen,'y':bb.ylen,'z':bb.zlen},'volume_mm3':solid.Volume()}

def read_params(path:str|Path)->dict[str,float]:
    with Path(path).open(newline='') as f: return {row['name']:float(row['value']) for row in csv.DictReader(f)}

def deterministic_behavior(model:dict[str,Any])->dict[str,Any]:
    p=model.get('parameters',{})
    return {'generator':'deterministic-baseline','behavior':'patrol-line','max_speed_mps':float(p.get('max_speed_mps',2.0)),'acceleration_mps2':float(p.get('acceleration_mps2',0.5)),'waypoints_m':[[0,0],[10,0],[10,10],[0,10],[0,0]],'constraints':['non-weaponized','stay_within_waypoints']}

def generate_behavior(model:dict[str,Any],provider:str='deterministic')->dict[str,Any]:
    if provider=='deterministic': return deterministic_behavior(model)
    if provider!='openai': raise ValueError(f'Unsupported AI provider: {provider}')
    key=os.getenv('OPENAI_API_KEY')
    if not key: raise RuntimeError('OPENAI_API_KEY is required for live generative-AI mode')
    from openai import OpenAI
    client=OpenAI(api_key=key)
    prompt={'task':'Generate a safe, non-weaponized kinematic behavior plan for a simulation asset.','constraints':['Return JSON only.','No weapons, targeting, attack, interception, vulnerability, or tactical behavior.','Use only engineering limits in the canonical model.','Schema: behavior:string, max_speed_mps:number, acceleration_mps2:number, waypoints_m:[[number,number]], constraints:[string].'],'canonical_model':model}
    data=json.loads(client.responses.create(model='gpt-5-mini',input=json.dumps(prompt)).output_text.strip()); data['generator']='openai'; return data

def build(manifest_path:str|Path,out_dir:str|Path,provider:str='deterministic')->dict[str,Any]:
    out=Path(out_dir); out.mkdir(parents=True,exist_ok=True); m=load_manifest(manifest_path); s=m['sources']
    cad=process_step(s['cad']['path'],out); sysml=parse_sysml(s['sysml']['path']); params=read_params(s['parameters']['path']); physics=yaml.safe_load(Path(s['physics']['path']).read_text())
    model={'asset_name':m['name'],'geometry':cad,'sysml':sysml,'parameters':params,'physics':physics,'units':{'geometry':'mm','mass':'kg','speed':'m/s','acceleration':'m/s^2'}}
    behavior=generate_behavior(model,provider)
    (out/'asot_manifest.json').write_text(json.dumps(m,indent=2)); (out/'canonical_model.json').write_text(json.dumps(model,indent=2)); (out/'behavior.json').write_text(json.dumps(behavior,indent=2))
    package={'schema_version':'0.1','asset_name':m['name'],'target':m['target'],'geometry':'asset.stl','canonical_model':'canonical_model.json','behavior':'behavior.json','asot_manifest':'asot_manifest.json'}
    (out/'package.json').write_text(json.dumps(package,indent=2)); viewer=Path(__file__).parent/'viewer'/'viewer.html'
    if viewer.exists(): shutil.copy2(viewer,out/'viewer.html')
    return package

def simulate(package_path:str|Path,seconds:float,out_path:str|Path,dt:float=.1)->list[dict]:
    package_path=Path(package_path); base=package_path.parent; pkg=json.loads(package_path.read_text()); b=json.loads((base/pkg['behavior']).read_text()); pts=[tuple(map(float,p)) for p in b['waypoints_m']]; vmax=float(b['max_speed_mps']); accel=float(b['acceleration_mps2']); x,y=pts[0]; idx=1; speed=0.; t=0.; rows=[]
    while t<=seconds+1e-9:
        tx,ty=pts[idx]; dx,dy=tx-x,ty-y; dist=math.hypot(dx,dy); speed=min(vmax,speed+accel*dt); step=min(dist,speed*dt)
        if dist>1e-9: x+=dx/dist*step; y+=dy/dist*step
        if dist<=max(.05,speed*dt): x,y=tx,ty; idx=(idx+1)%len(pts)
        rows.append({'t':round(t,3),'x':round(x,4),'y':round(y,4),'speed':round(speed,4)}); t+=dt
    Path(out_path).write_text(json.dumps(rows,indent=2)); return rows

def main():
    p=argparse.ArgumentParser(); sub=p.add_subparsers(dest='cmd',required=True); b=sub.add_parser('build'); b.add_argument('manifest'); b.add_argument('--out',required=True); b.add_argument('--ai-provider',choices=['deterministic','openai'],default='deterministic'); s=sub.add_parser('simulate'); s.add_argument('package'); s.add_argument('--seconds',type=float,default=10.); s.add_argument('--out',required=True); a=p.parse_args(); build(a.manifest,a.out,a.ai_provider) if a.cmd=='build' else simulate(a.package,a.seconds,a.out)
if __name__=='__main__': main()
