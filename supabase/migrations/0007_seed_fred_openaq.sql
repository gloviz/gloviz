insert into sources (id, name, homepage, license, attribution, tier) values
  ('fred', 'FRED, Federal Reserve Bank of St. Louis', 'https://fred.stlouisfed.org/',
   'FRED terms, attribution required', 'Source: Federal Reserve Bank of St. Louis (FRED)', 1),
  ('openaq', 'OpenAQ', 'https://openaq.org/',
   'CC BY 4.0', 'Source: OpenAQ', 1)
on conflict (id) do nothing;
