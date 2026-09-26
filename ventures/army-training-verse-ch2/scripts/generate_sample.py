from pathlib import Path
import csv
import cadquery as cq
from cadquery import exporters

ROOT = Path(__file__).resolve().parents[1]
S = ROOT / "samples"
S.mkdir(exist_ok=True)

# Generic unarmed cart: simple body + four wheel cylinders.
body = cq.Workplane("XY").box(1200, 700, 250)
for x in (-420, 420):
    for y in (-390, 390):
        wheel = cq.Workplane("YZ").workplane(offset=x).circle(120).extrude(80, both=True).translate((0, y, -120))
        body = body.union(wheel)
exporters.export(body, str(S / "generic_cart.step"))

(S / "generic_cart.sysml").write_text('''
package Demo {
  part def GenericCart {
    attribute maxSpeed : Real = 3.0;
    attribute acceleration : Real = 0.8;
    attribute batteryWh : Real = 1200.0;
    attribute autonomous : Boolean = true;
  }
}
''')

with (S / "parameters.csv").open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["name", "value"])
    w.writerow(["max_speed_mps", 3.0])
    w.writerow(["acceleration_mps2", 0.8])
    w.writerow(["turn_radius_m", 1.2])

(S / "physics.yaml").write_text('''
mass_kg: 185.0
center_of_mass_m: [0.0, 0.0, 0.2]
rolling_resistance_coefficient: 0.02
notes: synthetic generic engineering data for public demo
''')

(S / "manifest.yaml").write_text('''
name: generic_cart
sources:
  cad: generic_cart.step
  sysml: generic_cart.sysml
  parameters: parameters.csv
  physics: physics.yaml
target: browser-kinematic-sandbox
''')
print("Generated sample engineering artifacts in", S)
