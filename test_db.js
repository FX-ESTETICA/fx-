async function getShops() {
  const res = await fetch("https://otkzntibwinszparrkru.supabase.co/rest/v1/shops?select=id,owner_principal_id,name&limit=5", {
    headers: {
      "apikey": "sb_publishable_zvSB8MZJ4T_Oq51aNlzMEg_gDl1HeBM",
      "Authorization": "Bearer sb_publishable_zvSB8MZJ4T_Oq51aNlzMEg_gDl1HeBM"
    }
  });
  const data = await res.json();
  console.log(data);
}
getShops();