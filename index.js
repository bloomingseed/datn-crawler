const puppeteer = require('puppeteer-core');
const path = require('path')
const CONFIG = require("./lib/config")
const strategies = require('./strategies');
const adapters = require("./adapters");
const {openCsvWriter} = require("./lib/openCsvWriter")
const CSV_PATH = path.resolve(__dirname, './output/dataset-v2.csv')
const Worker = require('./lib/worker')
const CORES = 8;

let config = {
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--disable-dev-shm-usage']
};
//const adapter = require("./adapters/vietnamnet");

/*
(async () => {
  const browser = await puppeteer.launch(config);
  const page = await browser.newPage();
  let links = await strategy.crawl(page);
  let csvWriter = openCsvWriter(CSV_PATH, true)
  let failures = []
  for(let link of links){
    try{
      await strategy.extractText(csvWriter, link, page)
    } catch(e){
      failures.push(link)
      console.log(`Skipping ${link}...`)
    }
  }
  csvWriter.end()
  if(failures.length > 0){
    console.log("Failed links:")
    console.log(failures.join('\n'))
  }
  //fs.writeFile(OUTPUT_DIR + `vtv/${strategy.subject}.txt`, links.join("\n"), 'utf-8', ()=>console.log(`Written file ${strategy.label}.txt`))
  await browser.close();
})();
*/

(async () => {
  const browser = await puppeteer.launch(config);
  const pages = []
  for(let i = 0; i<CORES; ++i)
    pages.push(await browser.newPage());
  //const page = await browser.newPage();

  for(let source_id = 0; source_id<CONFIG.length; ++source_id){
    let source = CONFIG[source_id];
    let adapter = adapters[source.name]
    let strategy = strategies[source.name]
    for(let category_id = 0; category_id<source.templates.length; ++category_id){
      let rows = [];
      let queue = [];
      for(let i = 1; i<=source.limit; ++i)
        queue.push(source.templates[category_id].replace('#{i}', i))
      let workers = [];
      for(let i = 0; i<CORES; ++i){
        workers.push(Worker(`#${i+1}`, queue, {
          adapter, strategy, source_id, category_id, 
          page: pages[i]
        }))
      }
      let results = await Promise.all(workers);
      for(let result of results)
        for(let row of result)
          rows.push(row)
      /*
      for(let i = 1; i<=source.limit; ++i){
        console.log(`${source.name} -- Category ${category_id} -- Page ${i}/${source.limit}`)
        let indexUrl = source.templates[category_id].replace('#{i}', i)
        let articleUrls = await adapter.getArticleUrls(page, indexUrl);
        console.log(articleUrls.length)
        for(let url of articleUrls){
          let text = await strategy.crawl(url, page)
          console.log({source_id, category_id, url, text})
          rows.push(row)
        }
      }
      */
      let writer = openCsvWriter(CSV_PATH)
      for(let row of rows) writer.write(row)
      writer.end()
    }
  }
  /*
  let adapter = adapters.vietnamnet
  let source = CONFIG[3];
  //for(let h = 0; h<source.templates.length; ++h){
    //let template = source.templates[h];
    let template = source.templates[0];
    let urls = [];
    //for(let i = 1; i<=source.limit; ++i){
      let indexUrl = template.replace('#{i}', 1)
      let articleUrls = await adapter.getArticleUrls(page, indexUrl);
      console.log(articleUrls.length, articleUrls[0])

      for(let url of articleUrls){
        console.log(await strategy.crawl(url, page))
      }

      //for(let url of articleUrls) urls.push(url);
    //}
  //}
  */

  await browser.close();
})();

async function process(pageUrls, adapter, strategy){

}
