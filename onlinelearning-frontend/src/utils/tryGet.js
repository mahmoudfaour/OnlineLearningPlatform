import axios from "axios";

export async function tryGet(urls, config = {}) {
  for (const url of urls) {
    try {
      const response = await axios.get(url, config);
      return { ok: true, url, data: response.data };
    } catch {
      // try next
    }
  }
  return { ok: false, url: null, data: null };
}
