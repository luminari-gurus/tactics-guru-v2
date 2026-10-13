#!/usr/bin/env python3
"""Generate transparent pixel-art overworld assets for Tactics Guru.
No third-party dependencies: writes PNG RGBA files via stdlib.
"""
from __future__ import annotations

import os, struct, zlib, math, shutil
from pathlib import Path

OUT = Path(__file__).resolve().parent
CELL = 48
COLS = 5
ROWS = 4

PALETTE = {
    'transparent': (0,0,0,0),
    'outline': (47, 35, 38, 255),
    'deep_shadow': (30, 31, 35, 255),
    'dark_brown': (83, 54, 41, 255),
    'brown': (127, 82, 48, 255),
    'tan': (184, 129, 68, 255),
    'sand': (221, 174, 92, 255),
    'gold': (247, 202, 86, 255),
    'cream': (255, 226, 156, 255),
    'grass_dark': (55, 101, 59, 255),
    'grass': (86, 148, 68, 255),
    'grass_light': (129, 184, 90, 255),
    'pine_dark': (33, 71, 56, 255),
    'pine': (48, 111, 73, 255),
    'pine_light': (79, 151, 85, 255),
    'water_dark': (37, 78, 123, 255),
    'water': (55, 126, 169, 255),
    'water_light': (102, 181, 205, 255),
    'stone_dark': (83, 84, 86, 255),
    'stone': (124, 116, 105, 255),
    'stone_light': (181, 164, 125, 255),
    'fog': (103, 96, 118, 190),
    'fog_light': (169, 157, 173, 135),
    'red_dark': (132, 45, 48, 255),
    'red': (199, 68, 59, 255),
    'orange': (233, 128, 65, 255),
    'blue_dark': (52, 66, 126, 255),
    'blue': (74, 103, 196, 255),
    'purple': (116, 62, 149, 255),
    'black_alpha': (0,0,0,90),
}

def c(name): return PALETTE[name]

class Canvas:
    def __init__(self, w, h, fill=(0,0,0,0)):
        self.w, self.h = w, h
        self.px = [fill] * (w*h)
    def set(self, x, y, col):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y*self.w+x] = col
    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y*self.w+x]
        return (0,0,0,0)
    def rect(self, x,y,w,h,col):
        for yy in range(y, y+h):
            for xx in range(x, x+w): self.set(xx, yy, col)
    def checker(self, x,y,w,h,a,b,step=4):
        for yy in range(y,y+h):
            for xx in range(x,x+w): self.set(xx, yy, a if ((xx//step+yy//step)&1)==0 else b)
    def line(self, x0,y0,x1,y1,col):
        dx=abs(x1-x0); sx=1 if x0<x1 else -1; dy=-abs(y1-y0); sy=1 if y0<y1 else -1; err=dx+dy
        while True:
            self.set(x0,y0,col)
            if x0==x1 and y0==y1: break
            e2=2*err
            if e2>=dy: err+=dy; x0+=sx
            if e2<=dx: err+=dx; y0+=sy
    def poly(self, pts, col):
        miny=max(0, min(y for x,y in pts)); maxy=min(self.h-1, max(y for x,y in pts))
        for y in range(miny, maxy+1):
            xs=[]
            for i,(x1,y1) in enumerate(pts):
                x2,y2=pts[(i+1)%len(pts)]
                if y1==y2: continue
                if (y>=min(y1,y2)) and (y<max(y1,y2)):
                    xs.append(x1+(y-y1)*(x2-x1)/(y2-y1))
            xs.sort()
            for j in range(0,len(xs),2):
                if j+1 < len(xs):
                    for x in range(math.ceil(xs[j]), math.floor(xs[j+1])+1): self.set(x,y,col)
    def blit(self, src, dx, dy):
        for y in range(src.h):
            for x in range(src.w):
                col=src.get(x,y)
                if col[3]: self.set(dx+x,dy+y,col)
    def scale_nearest(self, nw, nh):
        out=Canvas(nw, nh)
        for y in range(nh):
            sy = int(y*self.h/nh)
            for x in range(nw):
                sx = int(x*self.w/nw)
                out.set(x,y,self.get(sx,sy))
        return out
    def save_png(self, path):
        raw = bytearray()
        for y in range(self.h):
            raw.append(0)
            for x in range(self.w): raw.extend(self.get(x,y))
        def chunk(t,d): return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
        data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', self.w,self.h,8,6,0,0,0)) + chunk(b'IDAT', zlib.compress(bytes(raw),9)) + chunk(b'IEND', b'')
        Path(path).write_bytes(data)

def tile_base(bg='grass'):
    cv=Canvas(CELL,CELL)
    cv.rect(0,0,CELL,CELL,c(bg))
    return cv

def dot_noise(cv, cols):
    # Keep decorative noise away from the outermost pixels so repeated tiles do
    # not expose mismatched edge flecks at seams.
    spots=[(5,7),(14,12),(27,8),(39,15),(8,28),(19,34),(31,29),(42,39),(23,22),(12,42)]
    for i,(x,y) in enumerate(spots):
        cv.rect(x,y,2+(i%2),1+(i%3==0),cols[i%len(cols)])

def grass_tile():
    cv=tile_base('grass')
    dot_noise(cv,[c('grass_dark'),c('grass_light'),c('sand')])
    for x,y in [(6,19),(17,6),(28,35),(37,24),(22,17),(42,8)]:
        cv.line(x,y,x+2,y-3,c('grass_light')); cv.line(x+2,y,x+4,y-2,c('grass_dark'))
    return cv

def forest_tile():
    cv=tile_base('grass_dark')
    trunks=[(10,26),(24,25),(36,28),(18,35),(31,36)]
    for tx,ty in trunks: cv.rect(tx,ty,4,10,c('dark_brown'))
    trees=[(12,16,15),(26,14,17),(38,18,14),(20,25,13),(33,26,14)]
    for x,y,r in trees:
        cv.poly([(x,y-r),(x-r,y+4),(x+r,y+4)],c('pine_dark'))
        cv.poly([(x,y-r+5),(x-r+3,y+9),(x+r-3,y+9)],c('pine'))
        cv.rect(x-1,y-r+4,3,3,c('pine_light'))
    return cv

def road_tile():
    cv=tile_base('grass')
    dot_noise(cv,[c('grass_dark'),c('grass_light'),c('brown')])
    # Normalized path art: a centered cross-shaped trail reaches all four edges
    # with identical opposite-edge pixels, so repeated road tiles connect both
    # horizontally and vertically without depending on orientation.
    for x0,y0,w,h in [(0,18,48,12),(18,0,12,48)]:
        cv.rect(x0,y0,w,h,c('dark_brown'))
    for x0,y0,w,h in [(0,16,48,12),(16,0,12,48)]:
        cv.rect(x0,y0,w,h,c('tan'))
    for x0,y0,w,h in [(0,19,48,6),(19,0,6,48)]:
        cv.rect(x0,y0,w,h,c('sand'))
    # Small interior pebbles give the path texture while leaving seam pixels
    # stable for adjacency.
    for x,y,col in [(7,16,'brown'),(35,28,'brown'),(14,25,'cream'),(29,20,'cream')]:
        cv.rect(x,y,2,1,c(col))
    return cv


def road_tile_variant(directions):
    """Directional dirt centerline road; no cross motif unless all directions connect."""
    cv=tile_base('grass')
    dot_noise(cv,[c('grass_dark'),c('grass_light'),c('brown')])
    dirs=set(directions)
    cx, cy = 24, 24
    # Shoulder, dirt, and center highlight are drawn in separate passes so
    # straight tiles read as continuous paths and intersections are special.
    widths=[18,12,6]
    cols=[c('dark_brown'),c('tan'),c('sand')]
    spans={
        'n': (cx-widths[0]//2, 0, widths[0], cy+1),
        's': (cx-widths[0]//2, cy, widths[0], 48-cy),
        'w': (0, cy-widths[0]//2, cx+1, widths[0]),
        'e': (cx, cy-widths[0]//2, 48-cx, widths[0]),
    }
    for width,col in zip(widths,cols):
        for d in dirs:
            if d == 'n': cv.rect(cx-width//2,0,width,cy+1,col)
            if d == 's': cv.rect(cx-width//2,cy,width,48-cy,col)
            if d == 'w': cv.rect(0,cy-width//2,cx+1,width,col)
            if d == 'e': cv.rect(cx,cy-width//2,48-cx,width,col)
        cv.rect(cx-width//2,cy-width//2,width,width,col)
    # Round/soften endcaps by leaving grass corners and adding small dirt lips.
    for x,y,col in [(12,22,'brown'),(30,25,'brown'),(20,18,'cream'),(28,30,'cream')]:
        if cv.get(x,y)[3]: cv.rect(x,y,2,1,c(col))
    return cv


def border_dark_bevel_tile():
    cv=tile_base('stone_dark')
    cv.rect(2,2,44,44,c('stone'))
    cv.rect(4,4,40,5,c('stone_light'))
    cv.rect(4,4,5,40,c('stone_light'))
    cv.rect(4,39,40,5,c('deep_shadow'))
    cv.rect(39,4,5,40,c('deep_shadow'))
    for x,y in [(10,13),(25,9),(33,24),(16,34),(36,37)]:
        cv.rect(x,y,4,2,c('stone_dark'))
    return cv


def border_mossy_broken_tile():
    cv=border_dark_bevel_tile()
    for x,y,w,h in [(2,2,8,3),(37,2,7,4),(2,36,5,8),(28,41,11,3)]:
        cv.rect(x,y,w,h,c('grass_dark'))
    for x,y in [(9,5),(39,8),(7,38),(32,40),(18,42)]:
        cv.rect(x,y,3,2,c('grass_light'))
    return cv


def road_shoulder_endcap_tile():
    cv=road_tile_variant(['e'])
    cv.rect(0,17,10,14,c('grass'))
    for x,y in [(8,16),(8,30),(13,12),(13,35)]: cv.rect(x,y,3,2,c('grass_light'))
    return cv

def water_tile():
    cv=tile_base('water')
    # Repeat-safe ripples avoid the outermost rows/columns so adjacent water
    # tiles share the same edge color.
    for y in [10,21,33,41]:
        for x in range(-8,48,16):
            cv.line(x,y,x+7,y-2,c('water_light')); cv.line(x+7,y-2,x+14,y,c('water_dark'))
    return cv

def mountain_tile():
    cv=tile_base('stone_dark')
    peaks=[[(3,39),(17,9),(30,39)],[(17,40),(31,5),(46,40)],[(0,42),(10,23),(22,42)]]
    for pts in peaks: cv.poly(pts,c('outline'))
    cv.poly([(5,38),(17,11),(29,38)],c('stone'))
    cv.poly([(17,11),(22,38),(29,38)],c('stone_dark'))
    cv.poly([(12,21),(17,11),(21,20),(17,18)],c('cream'))
    cv.poly([(19,39),(31,7),(45,39)],c('stone_light'))
    cv.poly([(31,7),(36,39),(45,39)],c('stone'))
    cv.poly([(27,18),(31,7),(36,18),(32,16)],c('cream'))
    cv.rect(0,42,48,6,c('dark_brown'))
    return cv

def fog_tile():
    cv=Canvas(CELL,CELL)
    cv.rect(0,0,48,48,c('fog'))
    for y in [8,19,31,40]: cv.line(0,y,47,y+3,c('fog_light'))
    return cv

def empty_tile():
    cv=tile_base('sand')
    cv.rect(4,4,40,40,(194,143,75,255)); cv.rect(8,8,32,32,(205,156,88,255))
    for x,y in [(8,14),(18,31),(32,20),(39,36),(24,10)]: cv.rect(x,y,3,2,c('tan'))
    return cv

def icon_canvas(): return Canvas(CELL,CELL)

def diamond(cv, cx, cy, r, fill, outline=True):
    if outline: cv.poly([(cx,cy-r-2),(cx+r+2,cy),(cx,cy+r+2),(cx-r-2,cy)],c('outline'))
    cv.poly([(cx,cy-r),(cx+r,cy),(cx,cy+r),(cx-r,cy)],fill)

def sword(cv, x,y, col=c('cream')):
    cv.rect(x+6,y,3,22,col); cv.rect(x+5,y+18,5,3,c('gold')); cv.rect(x+2,y+20,11,3,c('brown')); cv.rect(x+7,y+23,2,5,c('dark_brown')); cv.poly([(x+7,y-5),(x+11,y+1),(x+8,y+3),(x+4,y+1)],col)

def start_icon():
    cv=icon_canvas(); cv.rect(22,12,4,28,c('dark_brown')); cv.poly([(25,13),(41,18),(25,24)],c('green' if False else 'pine_light')); cv.rect(16,38,18,4,c('outline')); cv.rect(18,36,14,3,c('gold')); return cv

def combat_icon(elite=False):
    cv=icon_canvas(); diamond(cv,24,25,17,c('red' if not elite else 'purple'))
    sword(cv,11,11); sword(cv,25,11,c('stone_light'))
    if elite: cv.rect(18,4,12,4,c('gold')); cv.rect(16,8,16,3,c('gold'))
    return cv

def boss_icon():
    cv=icon_canvas(); diamond(cv,24,25,19,c('red_dark'))
    cv.poly([(10,18),(16,7),(21,18)],c('outline')); cv.poly([(27,18),(33,7),(38,18)],c('outline'))
    cv.rect(13,18,22,16,c('orange')); cv.rect(17,24,4,4,c('cream')); cv.rect(27,24,4,4,c('cream')); cv.rect(21,32,6,3,c('outline'))
    return cv

def shop_icon():
    cv=icon_canvas(); cv.rect(12,20,24,18,c('brown')); cv.rect(14,23,20,15,c('sand')); cv.rect(10,16,28,6,c('red')); cv.rect(12,12,24,5,c('cream'))
    cv.rect(20,27,8,11,c('dark_brown')); cv.rect(29,26,4,4,c('water_light')); return cv

def camp_icon():
    cv=icon_canvas(); cv.rect(22,17,4,22,c('dark_brown')); cv.poly([(9,35),(24,12),(39,35)],c('blue')); cv.poly([(24,12),(25,35),(39,35)],c('blue_dark')); cv.rect(18,35,12,3,c('outline'))
    cv.rect(12,40,24,3,c('dark_brown')); return cv

def treasure_icon():
    cv=icon_canvas(); cv.rect(10,22,28,17,c('outline')); cv.rect(13,24,22,12,c('brown')); cv.rect(13,18,22,8,c('gold')); cv.rect(22,17,4,22,c('cream')); cv.rect(10,28,28,3,c('dark_brown')); return cv

def supply_icon():
    cv=icon_canvas(); cv.rect(13,18,22,22,c('outline')); cv.rect(15,20,18,18,c('tan')); cv.rect(19,15,10,5,c('cream')); cv.rect(21,23,4,12,c('grass_dark')); cv.rect(17,27,12,4,c('grass_dark')); return cv

def event_icon():
    cv=icon_canvas(); diamond(cv,24,25,17,c('blue_dark')); cv.rect(21,13,6,17,c('cream')); cv.rect(21,34,6,5,c('gold')); return cv

def player_marker():
    cv=icon_canvas();
    # glowing base token distinct from POIs
    cv.rect(15,36,18,5,(255,226,156,150)); cv.rect(18,33,12,3,c('gold'))
    cv.rect(22,12,4,23,c('outline')); cv.rect(24,13,3,22,c('dark_brown'))
    cv.poly([(26,13),(39,17),(26,23)],c('cream')); cv.poly([(26,16),(36,18),(26,21)],c('red'))
    cv.rect(17,24,14,12,c('blue')); cv.rect(19,21,10,5,c('cream')); cv.rect(20,28,3,6,c('outline')); cv.rect(27,28,3,6,c('outline'))
    return cv

SPRITES = [
    ('terrain_grass_plains', grass_tile()),
    ('terrain_forest', forest_tile()),
    ('terrain_road_path', road_tile_variant(['n','e','s','w'])),
    ('terrain_water', water_tile()),
    ('terrain_mountain_blocked', mountain_tile()),
    ('terrain_fog_unrevealed_overlay', fog_tile()),
    ('terrain_revealed_empty', empty_tile()),
    ('poi_start_trailhead', start_icon()),
    ('poi_regular_combat', combat_icon(False)),
    ('poi_elite_combat', combat_icon(True)),
    ('poi_boss', boss_icon()),
    ('poi_shop', shop_icon()),
    ('poi_camp', camp_icon()),
    ('poi_treasure_cache', treasure_icon()),
    ('poi_resource_supply_cache', supply_icon()),
    ('poi_event_unknown', event_icon()),
    ('player_party_marker', player_marker()),
    ('terrain_road_straight_horizontal', road_tile_variant(['w','e'])),
    ('terrain_road_straight_vertical', road_tile_variant(['n','s'])),
    ('terrain_road_corner_ne', road_tile_variant(['n','e'])),
    ('terrain_road_corner_se', road_tile_variant(['s','e'])),
    ('terrain_road_corner_sw', road_tile_variant(['s','w'])),
    ('terrain_road_corner_nw', road_tile_variant(['n','w'])),
    ('terrain_road_end_n', road_tile_variant(['n'])),
    ('terrain_road_end_e', road_tile_variant(['e'])),
    ('terrain_road_end_s', road_tile_variant(['s'])),
    ('terrain_road_end_w', road_tile_variant(['w'])),
    ('terrain_road_t_n', road_tile_variant(['n','e','w'])),
    ('terrain_road_t_e', road_tile_variant(['n','e','s'])),
    ('terrain_road_t_s', road_tile_variant(['e','s','w'])),
    ('terrain_road_t_w', road_tile_variant(['n','s','w'])),
    ('terrain_border_dark_bevel', border_dark_bevel_tile()),
    ('terrain_border_mossy_broken', border_mossy_broken_tile()),
    ('terrain_road_shoulder_endcap', road_shoulder_endcap_tile()),
]

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'individual_48').mkdir(exist_ok=True)
    (OUT/'individual_32').mkdir(exist_ok=True)
    rows=max(ROWS, math.ceil(len(SPRITES)/COLS))
    sheet=Canvas(CELL*COLS, CELL*rows)
    for idx,(name,img) in enumerate(SPRITES):
        x=(idx%COLS)*CELL; y=(idx//COLS)*CELL
        sheet.blit(img,x,y)
        img.save_png(OUT/'individual_48'/f'{idx:02d}_{name}.png')
        img.scale_nearest(32,32).save_png(OUT/'individual_32'/f'{idx:02d}_{name}.png')
    sheet.save_png(OUT/'overworld_8bit_tiles_icons_48px_sheet.png')
    sheet.scale_nearest(COLS*32,rows*32).save_png(OUT/'overworld_8bit_tiles_icons_32px_sheet.png')
    manifest='\n'.join(f'{i:02d}: row {i//COLS}, col {i%COLS}, {name}' for i,(name,_) in enumerate(SPRITES))+'\n'
    (OUT/'sprite_manifest.txt').write_text(manifest)
    print(f'Wrote {len(SPRITES)} sprites to {OUT}')
    print(f'48px sheet: {CELL*COLS}x{CELL*rows}; 32px sheet: {COLS*32}x{rows*32}')

if __name__ == '__main__': main()
