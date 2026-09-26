from pathlib import Path
import importlib.util,json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pipeline',ROOT/'pipeline.py'); p=importlib.util.module_from_spec(spec); spec.loader.exec_module(p)

def test_sysml(tmp_path):
    f=tmp_path/'x.sysml'; f.write_text('part def Cart { attribute speed : Real = 3.5; attribute enabled : Boolean = true; }'); d=p.parse_sysml(f); assert d['part_definition']=='Cart'; assert d['attributes']['speed']==3.5; assert d['attributes']['enabled'] is True

def test_sim(tmp_path):
    (tmp_path/'behavior.json').write_text(json.dumps({'waypoints_m':[[0,0],[1,0],[1,1],[0,1],[0,0]],'max_speed_mps':1,'acceleration_mps2':1})); (tmp_path/'package.json').write_text(json.dumps({'behavior':'behavior.json'})); rows=p.simulate(tmp_path/'package.json',1,tmp_path/'trajectory.json'); assert len(rows)>5 and rows[-1]['speed']>0
