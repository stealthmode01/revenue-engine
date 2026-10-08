import importlib.util
import sys
import types
from pathlib import Path

arcengine = types.ModuleType('arcengine')
class DummyFD: pass
class DummyState:
    WIN = 'WIN'
    NOT_PLAYED = 'NOT_PLAYED'
    GAME_OVER = 'GAME_OVER'
class DummyAction:
    RESET = object()
arcengine.FrameData = DummyFD
arcengine.GameAction = DummyAction
arcengine.GameState = DummyState
sys.modules['arcengine'] = arcengine

agents = types.ModuleType('agents')
agentmod = types.ModuleType('agents.agent')
class Agent: pass
agentmod.Agent = Agent
sys.modules['agents'] = agents
sys.modules['agents.agent'] = agentmod

path = Path(__file__).resolve().parents[1] / 'agent' / 'my_agent.py'
spec = importlib.util.spec_from_file_location('adaptive', path)
mod = importlib.util.module_from_spec(spec)
sys.modules['adaptive'] = mod
assert spec and spec.loader
spec.loader.exec_module(mod)

def test_fingerprint_changes():
    a = [[0, 0], [0, 1]]
    b = [[0, 0], [0, 2]]
    assert mod.frame_fingerprint(a, 0) != mod.frame_fingerprint(b, 0)
    assert mod.frame_fingerprint(a, 0) != mod.frame_fingerprint(a, 1)

def test_change_ratio():
    assert mod.frame_change_ratio([[1,1],[1,1]], [[1,1],[1,2]]) == 0.25

def test_salient_clicks():
    frame = [[5] * 8 for _ in range(8)]
    frame[0][0] = 14
    frame[0][1] = 14
    frame[1][0] = 14
    frame[0][6] = 8
    frame[0][7] = 8
    frame[1][7] = 8
    clicks = mod.salient_clicks(frame, limit=4)
    assert len(clicks) >= 2
    assert all(0 <= x <= 63 and 0 <= y <= 63 for x, y in clicks)

def test_empty():
    assert mod.salient_clicks([], limit=2)[0] == (32, 32)
