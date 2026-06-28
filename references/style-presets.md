# Style Presets Reference

Complete ASS (Advanced SubStation Alpha) style reference for the
`--style` flag and the `--custom` flag of `burn_subtitle.py`.

## Built-in presets

| Preset | FontSize | Outline | Back box | Shadow | BorderStyle | Vibe |
|---|---|---|---|---|---|---|
| `default` | 18 | 1.2 | 54% black | 0 | 4 | Clean modern, YouTube-style |
| `streaming` | 16 | 1.0 | 54% black | 0 | 4 | Compact, Netflix-like |
| `white_shadow` | 20 | 2.0 | no | 2 | 1 | Cinematic, dark videos |
| `yellow_black` | 20 | 2.5 | no | 0 | 1 | Traditional TV closed-caption |
| `minimal` | 16 | 0.8 | 27% black | 0 | 4 | Whisper-thin |

All presets use `PingFang SC` on macOS. On Linux/Windows override with
`--custom "FontName=..."`.

## Custom styles

Any ASS style key can be overridden via `--custom "Key=Value,Key=Value"`.

| Key | Meaning | Example |
|---|---|---|
| `FontName` | TTF/OTF name | `Helvetica`, `Noto Sans CJK SC` |
| `FontSize` | Pixels | `20` |
| `PrimaryColour` | Text color (`&HAABBGGRR`) | `&H00FFFFFF` (white) |
| `OutlineColour` | Outline color | `&H00000000` (black) |
| `BackColour` | Box color | `&H88000000` (54% black) |
| `Outline` | Outline thickness | `2.0` |
| `Shadow` | Drop shadow | `0`–`4` |
| `BorderStyle` | `1`=outline, `4`=opaque box | `4` |
| `Alignment` | Numpad position (2 = bottom-center) | `2` |
| `MarginV` | Bottom margin in pixels | `40` |

> The `&H` prefix in colors is little-endian AA-BB-GG-RR. So `&H00FFFFFF`
> is fully-opaque white, `&H88000000` is 54%-opaque black.

## Examples

### Bright green on dark, for demos
```bash
--custom "FontSize=24,PrimaryColour=&H0000FF00,OutlineColour=&H00FFFFFF,BackColour=&H66000000,BorderStyle=4"
```

### Large white text, no box, for dark cinematic footage
```bash
--custom "FontName=Helvetica,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=3,BorderStyle=1,MarginV=50"
```

### Bottom-right corner (YouTube-style creator tag)
```bash
--custom "Alignment=3,MarginV=20,MarginR=40,FontSize=14,PrimaryColour=&H00CCCCCC"
```

## Color picker

AA = alpha (00 = opaque, FF = transparent)
BB = blue
GG = green
RR = red

Examples:
- `&H00FFFFFF` — solid white
- `&H00000000` — solid black
- `&H0000FF00` — solid green (high-saturation)
- `&H00FF0000` — solid blue
- `&H000000FF` — solid red
- `&H88000000` — 54% transparent black
- `&H44FFFFFF` — 73% transparent white
