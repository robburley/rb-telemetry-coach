# Garage 61 Example Data

This folder stores copied Garage 61 responses for the local prototype. Fixture
filenames are derived from the endpoint path by removing the leading slash and
replacing each remaining slash with `-`.

## Fixture Map

| File | Endpoint | Meaning |
| --- | --- | --- |
| `api-internal-analyses-01KVBECPC8BM15DJ7X80X1RGCT.json` | `/api/internal/analyses/01KVBECPC8BM15DJ7X80X1RGCT` | Copied analysis metadata response for the two-lap comparison. |
| `api-internal-tracks-67.json` | `/api/internal/tracks/67` | Copied track metadata response for Interlagos GP. Includes `lap_length: 4306.5938` and sector markers in `sectors`. |
| `api-internal-laps-01KVBPW12Z5WJY1W33G47N95KW-tdf.txt` | `/api/internal/laps/01KVBPW12Z5WJY1W33G47N95KW/tdf` | Raw copied TDF response as a `data:application/octet-stream;base64,...` data URL. This is the reference lap by current v1 policy. |
| `api-internal-laps-01KVBPNG1EVNB3D9310P6X2J1K-tdf.txt` | `/api/internal/laps/01KVBPNG1EVNB3D9310P6X2J1K/tdf` | Raw copied TDF response as a `data:application/octet-stream;base64,...` data URL. This is the target lap by current v1 policy. |
| `api-internal-laps-01KVBPW12Z5WJY1W33G47N95KW-tdf.json` | `/api/internal/laps/01KVBPW12Z5WJY1W33G47N95KW/tdf` | Pre-decoded telemetry for the reference lap. Use as a golden decoder validation fixture, not provider input. |

## TDF Fixture Format

The checked-in `*-tdf.txt` files are raw copied response fixtures. Chrome copied
the binary `application/octet-stream` response as text data URLs:

```text
data:application/octet-stream;base64,...
```

They must be trimmed, prefix-checked, base64-decoded, and then passed to the
Garage 61 binary decoder. The decoded bytes should begin with the UTF-8 byte
sequence `f0 9f 8f 8e`.

Use the helper script to validate current and future raw captures:

```sh
node scripts/convert-garage61-data-url-fixtures.mjs --check
```

For local investigation only, the same script can write decoded binary scratch
files:

```sh
node scripts/convert-garage61-data-url-fixtures.mjs --out-dir .scratch/tdf
```

The `.txt` files remain the canonical checked-in raw copied response fixtures.
