# Style Preset Comparison

All presets share the same base layout: bottom-center subtitle, semi-transparent
background box, Chinese-friendly font (`PingFang SC` on macOS). The differences
are below.

| Preset | Best for | FontSize | Outline | Back box | Shadow | Vibe |
|---|---|---|---|---|---|---|
| `default` | General purpose, social media | 18 | 1.2 (thin) | Yes (54% black) | 0 | Clean modern, YouTube-style |
| `streaming` | Long-form talk shows, Netflix-like | 16 | 1.0 | Yes (54% black) | 0 | Compact, less distracting |
| `white_shadow` | Dark videos, cinematic | 20 | 2.0 | No | 2 | Movie-subtitle look |
| `yellow_black` | High contrast, accessibility | 20 | 2.5 | No | 0 | Traditional TV closed-caption |
| `minimal` | Soft footage, don't want to dominate | 16 | 0.8 | Yes (27% black) | 0 | Whisper-thin, almost invisible |

## When to use each

- **Marketing videos for social media** → `default`
- **Lectures, podcasts, interviews** → `streaming`
- **Short films, vlogs with cinematic footage** → `white_shadow`
- **Accessibility-first content (low vision, small screens)** → `yellow_black`
- **Product demos where the subtitle shouldn't compete with on-screen UI** → `minimal`

## Customizing further

The `--custom` flag lets you pass any ASS style key-value pairs:

```bash
python3 scripts/burn_subtitle.py video.mp4 sub.srt \
  --output out.mp4 \
  --custom "FontName=Helvetica,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=3,Alignment=2,MarginV=50"
```

Common keys:

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
