import { findBestImage } from "../src/lib/pexels";
import { saveImage, loadImages } from "../src/content/image-store";
import articles from "../src/content/articles.json";

async function main() {
  console.log("Loading existing images...");
  const existing = await loadImages();
  const pending = articles.filter((a) => !existing[a.slug]);

  if (pending.length === 0) {
    console.log("All articles already have images. Nothing to do.");
    return;
  }

  console.log(`Found ${pending.length} articles without images.`);
  let success = 0;
  let failed = 0;

  for (const article of pending) {
    process.stdout.write(`[${article.slug}] Searching... `);
    try {
      const image = await findBestImage(article.tags ?? [], article.title);
      if (image) {
        await saveImage(article.slug, image);
        console.log(`OK (${image.url.slice(0, 60)}...)`);
        success++;
      } else {
        console.log("NO RESULTS");
        failed++;
      }
    } catch (e: any) {
      console.log(`ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
}

main().catch(console.error);
