async function test() {
  try {
    const res = await fetch("https://script.google.com/macros/s/AKfycbxFXHlxWWuNl7WG3LNm3N3zLHzVBOd6kUpermFhcBgDbisjGdtgstOZuBxGtaw4ADAf/exec", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        targetSheet: "الطلاب_3_2026",
        values: ["test"]
      }),
      redirect: 'follow'
    });
    console.log("Status:", res.status);
    console.log("URL:", res.url);
    console.log("Redirected:", res.redirected);
    console.log("Headers:", res.headers);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
