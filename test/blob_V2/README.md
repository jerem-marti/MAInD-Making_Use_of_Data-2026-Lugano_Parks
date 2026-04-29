# Blob V2 Parameter Preset

This folder contains the Blob V2 Three.js/GLSL prototype. Use the parameter values below to reproduce the tuned blob state.

## Category Weights

Enter these values in the category weight fields, then use **Normalise to 1** if needed.

| Category | Input value | Normalised value |
| --- | ---: | ---: |
| Emotional | 0.46 | 0.461 |
| Sensory | 0.18 | 0.180 |
| Action | 0.20 | 0.204 |
| Relational | 0.05 | 0.048 |
| Infrastructure | 0.10 | 0.097 |
| Tension | 0.01 | 0.010 |
| **SUM** |  | **1.000** |

## Form Parameters

| Parameter | Value |
| --- | ---: |
| Hero size | 400px |
| Opacity | 100% |
| Edge softness | 87% |
| Internal blending | 100% |
| Internal flow | 60% |
| Silhouette wobble | 100% |
| Saturation | 68% |

## Breathing Parameters

| Parameter | Value |
| --- | ---: |
| Rate | 5.5s/cycle |
| Amplitude | 4.0% |

## What The Parameters Do

- **Category weights** control how strongly each park data category contributes to the blob colour field.
- **Hero size** controls the rendered size of the main blob preview.
- **Opacity** controls whole-blob transparency. `100%` is fully opaque; `0%` is invisible.
- **Edge softness** controls only the rim fade into the page background. The center stays sharp.
- **Internal blending** controls how smoothly the category colours mix inside the blob.
- **Internal flow** controls how much the internal colour anchors drift over time.
- **Silhouette wobble** controls the amount of animated edge deformation.
- **Saturation** controls the colour intensity of the blob.
- **Rate** controls the breathing pulse duration in seconds per cycle.
- **Amplitude** controls how much the blob scales during the breathing pulse.

## Running The Prototype

From this folder:

```sh
python3 serve_cwd.py
```

Then open:

```text
http://localhost:8001/
```
