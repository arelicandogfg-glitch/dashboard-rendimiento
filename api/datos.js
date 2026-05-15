export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID;

  if (!token || !dbId) {
    return res.status(500).json({ error: 'Faltan variables de entorno' });
  }

  try {
    let allResults = [];
    let cursor = undefined;

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: data.message });

      allResults = allResults.concat(data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const registros = allResults
      .map(page => {
        const props = page.properties;
        const fecha = props['Fecha']?.date?.start;
        const productor = props['Productor']?.select?.name || props['Productor']?.rich_text?.[0]?.plain_text;
        const item = props['Item']?.select?.name || props['Item']?.rich_text?.[0]?.plain_text;
        const cajas = props['Número de cajas']?.number;
        if (!fecha || !productor || !item || cajas == null) return null;
        return { fecha, productor, item, cajas };
      })
      .filter(Boolean)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    res.status(200).json({ registros });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
