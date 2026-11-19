#!/usr/bin/env python3
"""
生成模板自带的示例媒体（全部为程序合成的卡通场景，不含任何真实数据）。

用法：python3 scripts/gen_sample_media.py
依赖：Pillow、ffmpeg（libx264）
输出：public/media/samples/*.mp4 / *.jpg

视频左上角/右下角烧录了时间码和帧号，便于在播放器里验证逐帧步进与边界标注。
各事件的真实起止时间见 EVENTS，示例实验 JSON 中的 GT 即来自这里。
"""
import math
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'media', 'samples')
W, H, FPS = 480, 270, 25
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 13)
FONT_S = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 11)


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def lerp(a, b, t):
    return a + (b - a) * t


def seg(t, a, b):
    """t 在 [a,b] 内的归一化进度"""
    return ease((t - a) / (b - a)) if b > a else float(t >= b)


def person(d, x, y, color=(52, 101, 164), walk=0.0, arm=0.0, s=1.0, holding=None):
    """简笔人物：x 为中心，y 为脚底。walk 为步态相位，arm 为手臂抬起角度（0 下垂，1 举到头）"""
    head_r = 11 * s
    body_h = 42 * s
    leg = 30 * s
    hip_y = y - leg
    sh_y = hip_y - body_h
    # 腿
    sw = math.sin(walk) * 9 * s
    d.line([(x, hip_y), (x - sw, y)], fill=(40, 40, 40), width=int(5 * s))
    d.line([(x, hip_y), (x + sw, y)], fill=(40, 40, 40), width=int(5 * s))
    # 身体
    d.rounded_rectangle([x - 12 * s, sh_y, x + 12 * s, hip_y + 4 * s], radius=int(8 * s), fill=color)
    # 手臂
    ang = lerp(math.pi * 0.55, -math.pi * 0.35, arm)
    hx, hy = x + math.cos(ang) * 30 * s, sh_y + 6 * s + math.sin(ang) * 30 * s
    d.line([(x + 8 * s, sh_y + 6 * s), (hx, hy)], fill=(40, 40, 40), width=int(5 * s))
    d.line([(x - 8 * s, sh_y + 6 * s), (x - 14 * s - math.sin(walk) * 4, hip_y)], fill=(40, 40, 40), width=int(5 * s))
    if holding == 'cup':
        d.rounded_rectangle([hx - 5 * s, hy - 10 * s, hx + 5 * s, hy + 2 * s], radius=2, fill=(230, 230, 235), outline=(90, 90, 90))
    if holding == 'book':
        d.rectangle([hx - 10 * s, hy - 12 * s, hx + 10 * s, hy + 2 * s], fill=(200, 60, 60), outline=(90, 30, 30))
    # 头
    d.ellipse([x - head_r, sh_y - 2 * head_r - 2, x + head_r, sh_y - 2], fill=(244, 204, 170), outline=(90, 70, 60))


def overlay(d, t, f, title):
    # 底部信息条：左侧标注合成示例，右侧烧录时间码与帧号（用于核对逐帧步进）
    d.rectangle([0, H - 20, W, H], fill=(0, 0, 0))
    d.text((6, H - 17), f'SYNTHETIC DEMO · {title}', fill=(200, 200, 200), font=FONT_S)
    m, s = divmod(t, 60)
    tc = f'{int(m):02d}:{s:05.2f}  f{f:04d}'
    d.text((W - 144, H - 18), tc, fill=(255, 235, 120), font=FONT)


# ---------------------------------------------------------------- 场景 1：厨房
KITCHEN_DUR = 30.0


def kitchen(t):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    light = seg(t, 23.0, 23.6)
    wall = tuple(int(lerp(a, b, light)) for a, b in zip((150, 160, 170), (236, 228, 205)))
    d.rectangle([0, 0, W, 200], fill=wall)
    d.rectangle([0, 200, W, H], fill=(120, 96, 76))
    # 灯与开关
    d.ellipse([220, 22, 260, 40], fill=(255, 240, 160) if light > 0.5 else (120, 120, 120))
    d.rectangle([60, 110, 72, 128], fill=(240, 240, 240), outline=(80, 80, 80))
    # 台面
    d.rectangle([170, 140, 330, 200], fill=(170, 130, 95))
    d.rectangle([170, 132, 330, 142], fill=(210, 205, 200))
    # 冰箱
    d.rectangle([370, 60, 450, 200], fill=(225, 230, 235), outline=(110, 110, 120), width=2)
    open_p = seg(t, 6.2, 7.2) * (1 - seg(t, 10.4, 11.4))
    if open_p > 0.02:
        d.rectangle([374, 64, 446, 196], fill=(250, 250, 255))
        d.rectangle([376, 110, 444, 113], fill=(190, 190, 200))
        d.rectangle([376, 150, 444, 153], fill=(190, 190, 200))
        if t < 9.2:
            d.rectangle([420, 120, 430, 148], fill=(90, 160, 90))
        dw = lerp(80, 10, open_p)
        d.rectangle([370 - (80 - dw) * 0.9, 60, 370 - (80 - dw) * 0.9 + max(dw, 8), 200], fill=(205, 212, 220), outline=(110, 110, 120), width=2)
    else:
        d.rectangle([438, 100, 442, 140], fill=(120, 120, 130))
    # 杯子（在台面上，喝水时被拿起）
    drinking = 15.2 <= t <= 19.6
    if not drinking:
        d.rounded_rectangle([240, 120, 250, 132], radius=2, fill=(230, 230, 235), outline=(90, 90, 90))
    # 人物轨迹
    if t < 5.6:
        x, walk = lerp(-30, 340, seg(t, 0.3, 5.6)), t * 7
    elif t < 12.0:
        x, walk = 340, 0
    elif t < 14.6:
        x, walk = lerp(340, 262, seg(t, 12.0, 14.6)), t * 7
    elif t < 21.0:
        x, walk = 262, 0
    elif t < 22.8:
        x, walk = lerp(262, 90, seg(t, 21.0, 22.8)), t * 7
    elif t < 25.0:
        x, walk = 90, 0
    else:
        x, walk = lerp(90, -40, seg(t, 25.0, 29.0)), t * 7
    arm = 0.0
    holding = None
    if 6.0 <= t <= 11.6:
        arm = 0.55 * seg(t, 6.0, 6.4) * (1 - seg(t, 11.2, 11.6))
    if 9.2 <= t <= 12.0:
        holding = None
    if drinking:
        arm = seg(t, 15.2, 16.0) * (1 - seg(t, 18.8, 19.6))
        holding = 'cup'
    if 22.8 <= t <= 24.6:
        arm = 0.6 * seg(t, 22.8, 23.1) * (1 - seg(t, 24.2, 24.6))
    person(d, x, 232, walk=walk, arm=arm, holding=holding)
    return img


# ---------------------------------------------------------------- 场景 2：客厅
LIVING_DUR = 40.0


def living(t):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 195], fill=(214, 222, 228))
    d.rectangle([0, 195, W, H], fill=(150, 120, 92))
    # 窗户
    wo = seg(t, 30.4, 33.6)
    d.rectangle([330, 40, 440, 120], fill=(150, 200, 240), outline=(90, 90, 100), width=3)
    d.rectangle([385 - 52 * (1 - wo), 43, 385, 117], fill=(200, 215, 225))
    d.rectangle([385, 43, 385 + 52 * (1 - wo), 117], fill=(200, 215, 225))
    # 台灯
    lamp_on = t >= 13.0
    if lamp_on:
        d.polygon([(70, 150), (40, 200), (100, 200)], fill=(255, 245, 190))
    d.polygon([(55, 110), (85, 110), (92, 135), (48, 135)], fill=(240, 200, 90) if lamp_on else (170, 160, 130))
    d.rectangle([68, 135, 72, 190], fill=(80, 80, 80))
    # 沙发
    d.rounded_rectangle([130, 140, 300, 200], radius=12, fill=(120, 80, 140))
    d.rounded_rectangle([130, 120, 300, 160], radius=12, fill=(140, 96, 160))
    # 人物
    if t < 4.5:
        x, y, walk = lerp(-30, 215, seg(t, 0.2, 4.5)), 232, t * 7
    elif t < 7.0:
        x, y, walk = 215, lerp(232, 205, seg(t, 4.8, 6.6)), 0
    elif t < 27.0:
        x, y, walk = 215, 205, 0
    elif t < 29.6:
        x, y, walk = lerp(215, 300, seg(t, 27.6, 29.6)), lerp(205, 232, seg(t, 27.0, 28.0)), t * 7
    elif t < 34.0:
        x, y, walk = 300, 232, 0
    else:
        x, y, walk = lerp(300, 520, seg(t, 34.5, 39.5)), 232, t * 7
    arm, holding = 0.0, None
    if 7.8 <= t <= 26.6:
        arm = 0.5 * seg(t, 7.8, 8.6)
        holding = 'book'
    if 12.4 <= t <= 13.4:
        arm = 0.3
    if 30.0 <= t <= 33.8:
        arm = 0.8 * seg(t, 30.0, 30.4) * (1 - seg(t, 33.4, 33.8))
    person(d, x, y, color=(60, 140, 90), walk=walk, arm=arm, holding=holding)
    # 小狗快速跑过（短事件）
    if 21.0 <= t <= 23.2:
        dx = lerp(-40, 520, seg(t, 21.0, 23.2))
        d.ellipse([dx - 18, 222, dx + 18, 242], fill=(160, 110, 60))
        d.ellipse([dx + 12, 214, dx + 28, 230], fill=(160, 110, 60))
        d.line([(dx - 10, 240), (dx - 12, 252)], fill=(90, 60, 30), width=3)
        d.line([(dx + 10, 240), (dx + 12, 252)], fill=(90, 60, 30), width=3)
    return img


# ---------------------------------------------------------------- 场景 3：街道
STREET_DUR = 24.0


def street(t):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 150], fill=(170, 210, 240))
    d.ellipse([400, 20, 440, 60], fill=(255, 225, 110))
    d.rectangle([0, 150, W, 175], fill=(190, 190, 190))
    d.rectangle([0, 175, W, 245], fill=(70, 70, 75))
    for i in range(0, W, 60):
        d.rectangle([i + 10, 208, i + 40, 212], fill=(240, 240, 240))
    d.rectangle([0, 245, W, H], fill=(190, 190, 190))
    # 斑马线
    for i in range(6):
        d.rectangle([200 + i * 14, 178, 208 + i * 14, 243], fill=(235, 235, 235))
    # 汽车 3–7s
    if 3.0 <= t <= 7.0:
        cx = lerp(-80, 560, seg(t, 3.0, 7.0))
        d.rounded_rectangle([cx - 40, 188, cx + 40, 214], radius=6, fill=(200, 60, 60))
        d.rounded_rectangle([cx - 24, 176, cx + 20, 192], radius=5, fill=(220, 90, 90))
        d.ellipse([cx - 30, 206, cx - 16, 220], fill=(30, 30, 30))
        d.ellipse([cx + 16, 206, cx + 30, 220], fill=(30, 30, 30))
    # 行人过马路 9–14s
    if t < 9.0:
        px, py, walk = 230, 168, 0
    elif t <= 14.0:
        px, py, walk = 230, lerp(168, 262, seg(t, 9.0, 14.0)), t * 7
    else:
        px, py, walk = lerp(230, 380, seg(t, 14.2, 17.0)), 262, (t * 7 if t < 17 else 0)
    person(d, px, py, color=(200, 140, 40), walk=walk, s=0.8)
    # 皮球弹跳 16.0–17.0s（极短事件）
    if 16.0 <= t <= 17.0:
        k = seg(t, 16.0, 17.0)
        bx = lerp(120, 180, k)
        by = 230 - abs(math.sin(k * math.pi * 2)) * 40
        d.ellipse([bx - 8, by - 8, bx + 8, by + 8], fill=(60, 120, 220))
    # 公交 18–23s 进站停靠
    if t >= 18.0:
        bx = lerp(560, 330, seg(t, 18.0, 20.0)) if t < 21.5 else lerp(330, 600, seg(t, 21.8, 23.6))
        d.rounded_rectangle([bx - 70, 160, bx + 70, 215], radius=8, fill=(60, 150, 110))
        for i in range(4):
            d.rectangle([bx - 60 + i * 30, 168, bx - 40 + i * 30, 186], fill=(200, 230, 240))
        d.ellipse([bx - 52, 206, bx - 34, 224], fill=(30, 30, 30))
        d.ellipse([bx + 34, 206, bx + 52, 224], fill=(30, 30, 30))
    return img


def render(name, fn, dur, title):
    path = os.path.join(OUT, f'{name}.mp4')
    cmd = [
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'veryfast', '-g', str(FPS), '-movflags', '+faststart', path,
    ]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(dur * FPS)
    for f in range(n):
        t = f / FPS
        img = fn(t)
        overlay(ImageDraw.Draw(img), t, f, title)
        p.stdin.write(img.tobytes())
    p.stdin.close()
    p.wait()
    # 海报帧
    poster = fn(dur * 0.3)
    overlay(ImageDraw.Draw(poster), dur * 0.3, int(dur * 0.3 * FPS), title)
    poster.save(os.path.join(OUT, f'{name}.jpg'), quality=82)
    print('wrote', path)


# ---------------------------------------------------------------- 静态图像
def still_table():
    img = Image.new('RGB', (640, 420), (232, 226, 214))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 300, 640, 420], fill=(150, 110, 80))
    d.rectangle([40, 250, 600, 300], fill=(180, 135, 95))
    d.rounded_rectangle([110, 190, 160, 252], radius=6, fill=(205, 60, 60))   # 红杯 左
    d.rounded_rectangle([290, 140, 330, 252], radius=8, fill=(70, 150, 90))   # 绿瓶 中
    d.rectangle([302, 120, 318, 142], fill=(50, 110, 70))
    d.rounded_rectangle([430, 190, 480, 252], radius=6, fill=(60, 110, 210))  # 蓝杯 右
    d.rectangle([500, 228, 580, 252], fill=(240, 220, 120), outline=(120, 100, 40))  # 书
    d.text((10, 6), 'SYNTHETIC DEMO', fill=(120, 120, 120), font=FONT_S)
    img.save(os.path.join(OUT, 'rec_table.jpg'), quality=85)


def still_shelf():
    img = Image.new('RGB', (640, 420), (226, 232, 236))
    d = ImageDraw.Draw(img)
    for y in (150, 290):
        d.rectangle([60, y, 580, y + 14], fill=(140, 100, 70))
    for x in (110, 170, 230):
        d.ellipse([x - 24, 102, x + 24, 150], fill=(210, 50, 50))
        d.line([(x, 104), (x + 4, 92)], fill=(90, 60, 30), width=3)
    for x in (380, 470):
        d.arc([x - 40, 200, x + 40, 290], 20, 160, fill=(235, 200, 60), width=14)
    d.text((10, 6), 'SYNTHETIC DEMO', fill=(120, 120, 120), font=FONT_S)
    img.save(os.path.join(OUT, 'vqa_shelf.jpg'), quality=85)


def still_park():
    img = Image.new('RGB', (640, 420), (170, 214, 245))
    d = ImageDraw.Draw(img)
    d.ellipse([520, 30, 580, 90], fill=(255, 220, 100))
    d.rectangle([0, 280, 640, 420], fill=(110, 170, 90))
    d.rectangle([110, 170, 130, 290], fill=(110, 80, 50))
    d.ellipse([60, 90, 180, 200], fill=(60, 130, 60))
    d.rectangle([380, 250, 520, 262], fill=(130, 90, 60))
    d.rectangle([390, 262, 398, 290], fill=(90, 60, 40))
    d.rectangle([502, 262, 510, 290], fill=(90, 60, 40))
    person(d, 300, 330, color=(200, 80, 120), walk=0.6, arm=0.15)
    d.ellipse([340, 306, 376, 326], fill=(160, 110, 60))
    d.ellipse([368, 296, 384, 312], fill=(160, 110, 60))
    d.line([(318, 300), (350, 312)], fill=(60, 60, 60), width=2)
    d.text((10, 6), 'SYNTHETIC DEMO', fill=(90, 90, 90), font=FONT_S)
    img.save(os.path.join(OUT, 'caption_park.jpg'), quality=85)


def thumbs():
    """检索候选缩略图：从各场景截取若干帧"""
    for name, fn, t in [('kitchen_fridge', kitchen, 8.0), ('kitchen_drink', kitchen, 17.0), ('kitchen_light', kitchen, 24.0),
                        ('living_read', living, 16.0), ('living_dog', living, 22.0), ('street_bus', street, 20.0)]:
        img = fn(t).resize((240, 135))
        img.save(os.path.join(OUT, f'thumb_{name}.jpg'), quality=80)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    render('kitchen', kitchen, KITCHEN_DUR, 'kitchen')
    render('living', living, LIVING_DUR, 'living room')
    render('street', street, STREET_DUR, 'street')
    still_table()
    still_shelf()
    still_park()
    thumbs()
