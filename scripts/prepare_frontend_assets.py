"""Reproducible, licensed design assets. No qiaopi originals are downloaded."""
import concurrent.futures, json, re, urllib.request, urllib.parse
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / 'frontend'
UA = {'User-Agent': 'QiaomaiFrontend/1.0 (educational local prototype)'}
def read(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=35).read()
def query(params):
    return json.loads(read('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(action='query',format='json',**params))))
def category(name):
    d=query(dict(generator='categorymembers',gcmtitle='Category:'+name,gcmtype='file',gcmlimit=35,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1200))
    return list(d.get('query',{}).get('pages',{}).values())
def file(name):
    d=query(dict(titles='File:'+name,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1400))
    return next(iter(d['query']['pages'].values()))
def save_asset(key,p):
    ii=p['imageinfo'][0]; m=ii['extmetadata']
    license=m.get('LicenseShortName',{}).get('value','')
    if not any(v in license for v in ['Public domain','CC BY','CC0']): raise ValueError('unsupported license '+license)
    url=(ii.get('thumburl') or ii['url']).split('?')[0]
    ext=Path(urllib.parse.urlsplit(url).path).suffix.lower()
    dest=ROOT/'assets/media'/(key+ext)
    dest.write_bytes(read(url))
    clean=lambda s:re.sub('<[^>]+>','',s)
    return dict(key=key,path='assets/media/'+dest.name,title=p['title'][5:],source_url=ii['descriptionurl'],download_url=url,author=clean(m.get('Artist',{}).get('value','Unknown')),license=license,license_url=m.get('LicenseUrl',{}).get('value','https://creativecommons.org/publicdomain/mark/1.0/'),usage='Historical photograph; CSS warm toning and display framing only',retrieved_at='2026-10-08')
def job(key,source,pattern=None):
    try:
        if pattern:
            ps=category(source); choices=[p for p in ps if re.search(pattern,p['title'],re.I)]
            if not choices:
                print('CANDIDATES',key,json.dumps([p['title'] for p in ps],ensure_ascii=True));return None
            p=choices[0]
        else:p=file(source)
        result=save_asset(key,p);print('OK',key);return result
    except Exception as e:print('FAILED',key,str(e));return None
jobs=[
 ('chen','年轻的陈嘉庚.jpg',None),
 ('lee','Lee Kong Chian, 1946.png',None),
 ('situ','Situ Meitang.jpg',None),
 ('hu','Hu Wenhu.jpg',None),
 ('rong','Yung Wing, 1910.jpg',None),
 ('harbour','KITLV - 50215 - Lambert & Co., G.R. - Singapore - Port in Singapore - circa 1900.jpg',None),
 ('xmu','Xiamen Daxue 20120226-01.jpg',None),
 ('jimei','Tan Kah Kee Memorial Hall.jpg',None),
 ('tulou','Earth building.jpg',None),
]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    items=[x for x in pool.map(lambda j:job(*j),jobs) if x]
(ROOT/'assets/media/media_manifest.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'assets/js/media.js').write_text('window.QM_MEDIA='+json.dumps({x['key']:x for x in items},ensure_ascii=False)+';\n',encoding='utf-8')
downloads={
 'vendor/echarts/echarts.min.js':'https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js',
 'vendor/echarts/LICENSE.txt':'https://cdn.jsdelivr.net/npm/echarts@5.6.0/LICENSE',
 'vendor/lucide/lucide.min.js':'https://cdn.jsdelivr.net/npm/lucide@0.468.0/dist/umd/lucide.min.js',
 'vendor/lucide/LICENSE.txt':'https://cdn.jsdelivr.net/npm/lucide@0.468.0/LICENSE',
 'assets/geo/world.json':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
}
for path,url in downloads.items():
    try:
        data=read(url);(ROOT/path).write_bytes(data)
        if path.endswith('world.json'):
            world=json.loads(data)
            (ROOT/'assets/geo/world.js').write_text('window.QM_WORLD='+json.dumps(world,separators=(',',':'))+';',encoding='utf-8')
        print('VENDOR',path,len(data))
    except Exception as e:print('FAILED',path,str(e))
