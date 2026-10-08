import csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
R01C = ROOT / "data" / "canonical" / "R01"
R01S = ROOT / "data" / "collection" / "R01"
R01P = ROOT / "data" / "presentation" / "R01"

def read_jsonl(p):
    if not p.exists():
        return []
    out=[]
    for i,line in enumerate(p.read_text(encoding="utf-8-sig").splitlines(),1):
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except Exception as e:
            raise RuntimeError(f"{p}:{i}: invalid json: {e}")
    return out

def read_csv(p):
    if not p.exists():
        return []
    with p.open("r",encoding="utf-8-sig",newline="") as f:
        return list(csv.DictReader(f))

def split_ids(v):
    if not v:
        return []
    return [x.strip() for x in str(v).strip().strip('"').split("|") if x.strip()]

errors=[]
warnings=[]

persons=read_jsonl(R01C/"persons.jsonl")
places=read_jsonl(R01C/"places.jsonl")
orgs=read_jsonl(R01C/"organizations.jsonl")
pres=read_jsonl(R01P/"persons.jsonl")
person_sources=read_jsonl(R01S/"person_source_matrix.jsonl")
org_sources=read_jsonl(R01S/"organization_source_matrix.jsonl")
events=read_csv(R01C/"events.csv")
org_events=read_csv(R01C/"organization_events.csv")
relations=read_csv(R01C/"relations.csv")
qiaopi=read_csv(R01S/"qiaopi_candidates.csv")

def ids(rows,key="id"):
    vals=[r.get(key) for r in rows if r.get(key)]
    seen=set(); dup=[]
    for v in vals:
        if v in seen: dup.append(v)
        seen.add(v)
    return set(vals), sorted(set(dup))

person_ids,pdup=ids(persons)
place_ids,pldup=ids(places)
org_ids,odup=ids(orgs)
source_ids=set(x["source_id"] for x in person_sources+org_sources)
event_ids=set()
for row in events+org_events:
    eid=row.get("event_id")
    if eid in event_ids: errors.append(f"duplicate event_id: {eid}")
    event_ids.add(eid)

for label,dup in [("person",pdup),("place",pldup),("org",odup)]:
    for d in dup: errors.append(f"duplicate {label} id: {d}")

for p in persons:
    for sid in p.get("source_ids",[]):
        if sid not in source_ids:
            errors.append(f"person {p['id']} missing source {sid}")
    for eid in p.get("event_ids",[]):
        if eid not in event_ids:
            errors.append(f"person {p['id']} missing event {eid}")

for x in pres:
    if x.get("id") not in person_ids:
        errors.append(f"presentation missing person {x.get('id')}")
    for pid in x.get("placeIds",[]):
        if pid not in place_ids: errors.append(f"presentation {x.get('id')} missing place {pid}")
    for oid in x.get("orgIds",[]):
        if oid not in org_ids: errors.append(f"presentation {x.get('id')} missing org {oid}")

for row in relations:
    rid=row.get("relation_id","?")
    s=row.get("subject_id")
    o=row.get("object_id")
    if s and s.startswith("person_") and s not in person_ids: errors.append(f"{rid} missing subject {s}")
    if o and o.startswith("place_") and o not in place_ids: errors.append(f"{rid} missing place {o}")
    if o and o.startswith("org_") and o not in org_ids: errors.append(f"{rid} missing org {o}")
    for sid in split_ids(row.get("source_ids")):
        if sid not in source_ids: errors.append(f"{rid} missing source {sid}")

for row in events+org_events:
    eid=row.get("event_id","?")
    for p in split_ids(row.get("person_ids")):
        if p not in person_ids: errors.append(f"{eid} missing person {p}")
    for p in split_ids(row.get("place_ids")):
        if p not in place_ids: errors.append(f"{eid} missing place {p}")
    for o in split_ids(row.get("organization_ids")):
        if o not in org_ids: errors.append(f"{eid} missing org {o}")
    for sid in split_ids(row.get("source_ids")):
        if sid not in source_ids: errors.append(f"{eid} missing source {sid}")

archive_numbers=[r.get("archive_number","").strip() for r in qiaopi if r.get("archive_number","").strip()]
seen=set()
for n in archive_numbers:
    if n in seen: errors.append(f"duplicate qiaopi archive_number: {n}")
    seen.add(n)

qiaopi_image_checked=sum(1 for r in qiaopi if "image" in (r.get("image_status") or "") and "visible" in (r.get("image_status") or ""))
qiaopi_detail_unchecked=sum(1 for r in qiaopi if (r.get("image_status") or "")=="detail_not_checked")
qiaopi_date_review=sum(1 for r in qiaopi if "date_needs_review" in (r.get("review_status") or ""))

reviewed_persons=sum(1 for x in persons if x.get("review_status")=="reviewed")
reviewed_orgs=sum(1 for x in orgs if x.get("review_status")=="reviewed")
reviewed_events=sum(1 for x in events+org_events if x.get("review_status")=="reviewed")

if reviewed_persons < 5: warnings.append("R01 publish gate: reviewed persons < 5")
if reviewed_orgs < 10: warnings.append("R01 publish gate: reviewed organizations < 10")
if qiaopi_image_checked < 30: warnings.append("R01 publish gate: page/image checked qiaopi < 30")
# text normalization is not claimed here; it is still 0 until files exist.
normalized_dir=R01S/"qiaopi_normalized"
normalized_count=0
if normalized_dir.exists():
    normalized_count=sum(1 for p in normalized_dir.glob("*/normalized_text.txt") if p.stat().st_size>0)
if normalized_count < 10: warnings.append("R01 publish gate: normalized qiaopi text < 10")

report={
    "batch":"R01",
    "counts":{
        "persons":len(persons),
        "reviewed_persons":reviewed_persons,
        "places":len(places),
        "organizations":len(orgs),
        "reviewed_organizations":reviewed_orgs,
        "person_events":len(events),
        "organization_events":len(org_events),
        "reviewed_events_total":reviewed_events,
        "relations":len(relations),
        "source_records":len(person_sources)+len(org_sources),
        "presentation_persons":len(pres),
        "qiaopi_candidates":len(qiaopi),
        "qiaopi_image_checked":qiaopi_image_checked,
        "qiaopi_detail_unchecked":qiaopi_detail_unchecked,
        "qiaopi_date_needs_review":qiaopi_date_review,
        "qiaopi_normalized_text":normalized_count
    },
    "errors":errors,
    "warnings":warnings,
    "publish_gate_passed": len(errors)==0 and reviewed_persons>=5 and reviewed_orgs>=10 and qiaopi_image_checked>=30 and normalized_count>=10
}
out=R01S/"AUTO_VALIDATION.json"
out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
