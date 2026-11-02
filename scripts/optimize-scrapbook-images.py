"""Rebuild public WebP artwork from preserved masters. Requires Pillow; never used at runtime."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
masters=root/'source-assets/images'
metadata={};inventory=[]
for source in sorted(masters.rglob('*')):
 if source.suffix.lower() not in ('.png','.jpg','.jpeg'):continue
 relative=source.relative_to(masters).with_suffix('.webp')
 targets=[app/'public'/relative for app in (root/'apps').iterdir() if (app/'public'/relative).exists()]
 if not targets:continue
 image=Image.open(source);quality=94 if any(n in source.name for n in ('integrated-','ornate-')) else 92
 info={'width':image.width,'height':image.height}
 small=None;mobile=None
 if image.width>640:
  small=image.copy();small.thumbnail((640,10000));info['smallWidth']=small.width
 if 'desk-scene' in source.name:
  mobile=image.copy();mobile.thumbnail((1280,10000))
 for target in targets:
  image.save(target,'WEBP',quality=quality,method=6)
  if small:small.save(target.with_name(target.stem+'-small.webp'),'WEBP',quality=quality,method=6)
  if mobile:mobile.save(target.with_name(target.stem+'-mobile.webp'),'WEBP',quality=92,method=6)
 metadata['/'+str(relative)]=info
 inventory.append({'source':str(source.relative_to(root)),'originalBytes':source.stat().st_size,'webpBytes':targets[0].stat().st_size,'quality':quality,'apps':[str(t.relative_to(root)) for t in targets]})
(root/'packages/scrapbook-ui/src/optimized-images.ts').write_text('export const optimizedImages:Record<string,{width:number;height:number;smallWidth?:number}>='+json.dumps(metadata)+';\n')
(root/'docs/image-optimization.json').write_text(json.dumps(inventory,indent=2)+'\n')
