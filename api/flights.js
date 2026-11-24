// Optional server-side live flight lookup. No provider credentials in the browser.
const code = /^[A-Z]{3}$/;
const date = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value) {
  if (typeof value !== 'string' || !date.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === value &&
    value >= new Date().toISOString().slice(0,10);
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error:'METHOD'}); }
  if (process.env.ZFLY_LIVE_ENABLED !== 'true' || !process.env.DUFFEL_ACCESS_TOKEN) {
    return res.status(503).json({error:'NOT_CONFIGURED'});
  }
  // Browser requests are same-origin. Production deployments also need edge rate limiting.
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return res.status(403).json({error:'ORIGIN'});
  let q;
  try { q = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (_) { return res.status(400).json({error:'INVALID_QUERY'}); }
  if (!q || !Array.isArray(q.legs) || q.legs.length < 1 || q.legs.length > 5 ||
      !['oneway','roundtrip','multicity'].includes(q.tripType) ||
      !Number.isInteger(q.passengers?.adults) || q.passengers.adults < 1 || q.passengers.adults > 9 ||
      q.passengers.children !== 0 || q.passengers.infants !== 0 ||
      !['economy','premium_economy','business','first'].includes(q.cabin) ||
      (q.tripType !== 'multicity' && q.legs.length !== 1) ||
      q.legs.some((l,i) => !l || !code.test(l.origin) || !code.test(l.destination) || l.origin === l.destination ||
        !validDate(l.date) || (i > 0 && l.date < q.legs[i-1].date))) {
    return res.status(400).json({error:'INVALID_QUERY'});
  }
  const slices = q.legs.map(l => ({origin:l.origin,destination:l.destination,departure_date:l.date}));
  if (q.tripType === 'roundtrip') {
    if (!validDate(q.returnDate) || q.returnDate < q.legs[0].date) return res.status(400).json({error:'INVALID_QUERY'});
    slices.push({origin:slices[0].destination,destination:slices[0].origin,departure_date:q.returnDate});
  }
  try {
    const upstream = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=12000', {
      method:'POST', signal:AbortSignal.timeout(20000),
      headers:{Authorization:'Bearer '+process.env.DUFFEL_ACCESS_TOKEN,'Duffel-Version':'v2','Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({data:{slices,passengers:Array.from({length:q.passengers.adults},()=>({type:'adult'})),cabin_class:q.cabin,max_connections:q.directOnly?0:2}})
    });
    if (!upstream.ok) return res.status(upstream.status===429?429:502).json({error:'PROVIDER_ERROR'});
    const payload = (await upstream.json()).data;
    if (payload?.live_mode !== true) return res.status(503).json({error:'NOT_LIVE'});
    const offers = (Array.isArray(payload.offers)?payload.offers:[]).filter(o=>o.live_mode===true && o.total_amount && o.total_currency)
      .slice(0,50).map(o=>({id:o.id,airline:o.owner?.name||'Airline',amount:o.total_amount,currency:o.total_currency,expiresAt:o.expires_at,
        slices:(o.slices||[]).map(s=>({origin:s.origin?.iata_code,destination:s.destination?.iata_code,duration:s.duration,
          segments:(s.segments||[]).map(g=>({origin:g.origin?.iata_code,destination:g.destination?.iata_code,departure:g.departing_at,arrival:g.arriving_at,flight:g.marketing_carrier?.iata_code+' '+g.marketing_carrier_flight_number}))}))}));
    return res.status(200).json({provider:'Duffel',live:true,offers});
  } catch (_) { return res.status(502).json({error:'PROVIDER_ERROR'}); }
};
