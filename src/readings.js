// Shared statistical policy: preserve raw values; one accepted retry per original slot.
// JSON is guarded before extraction so malformed legacy detail cannot break reports.
export const EFFECTIVE_SAMPLES = `WITH retry_details AS (
 SELECT samples.*, CASE WHEN json_valid(detail) THEN detail ELSE '{}' END AS safe_detail FROM samples
), accepted AS (
 SELECT retry_details.*, CASE WHEN status='zero_unverified' AND count=0
  AND json_extract(safe_detail,'$.kind')='zero_recheck'
  AND json_extract(safe_detail,'$.retry.status')='ok'
  AND json_type(safe_detail,'$.retry.count')='integer'
  AND json_extract(safe_detail,'$.retry.count') BETWEEN 1 AND 5000
  AND (unixepoch(json_extract(safe_detail,'$.retry.at'))-unixepoch(fetched_at)) BETWEEN 0 AND 120
 THEN 1 ELSE 0 END AS retry_accepted FROM retry_details
), effective_samples AS (
 SELECT accepted.*,
 CASE WHEN retry_accepted=1 THEN json_extract(safe_detail,'$.retry.count') ELSE count END AS effective_count,
 CASE WHEN retry_accepted=1 THEN 'ok' ELSE status END AS effective_status,
 CASE WHEN retry_accepted=1 THEN json_extract(safe_detail,'$.retry.at') ELSE fetched_at END AS effective_at
 FROM accepted
)`;
export function displaySample(row) {
 return {...row,raw_count:row.count,raw_status:row.status,raw_fetched_at:row.fetched_at,
 count:row.effective_count===undefined?row.count:row.effective_count,
 status:row.effective_status??row.status,fetched_at:row.effective_at??row.fetched_at,
 rechecked:row.retry_accepted===1};
}
