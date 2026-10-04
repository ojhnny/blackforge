# buggy_python

Intentionally buggy analytics helpers used by BlackForge for deterministic demos.

## Bug

`analytics.rolling.rolling_mean` raises `TypeError` when a window contains `None`.

## Reproduce

```bash
cd examples/buggy_python
PYTHONPATH=src pytest tests/test_rolling_mean_none.py -q
```

Or via BlackForge referee:

```bash
blackforge reproduce \
  --repo examples/buggy_python \
  --test tests/test_rolling_mean_none.py \
  --local
```
