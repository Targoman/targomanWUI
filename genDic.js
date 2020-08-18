const fs = require('fs')
const path = require('path')
const readline = require('readline');
const ejs = require('ejs');
const minify = require('html-minifier').minify;
const gzipme = require("gzipme");

let counter = 0
function render(to, template, json) {
  console.log(`${counter} Rendering ${template} -> ${to}`);
  let templateFile = fs.readFileSync(template, { encoding: 'utf8' });
  fs.writeFileSync(to, minify(
    ejs.render(templateFile, json, { filename: template }),
    {
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      decodeEntities: true,
      minifyCSS: true,
      minifyJS: true,
      processConditionalComments: true,
      processScripts: 'text/html',
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      removeComments:true,
      useShortDoctype: true,
      trimCustomFragments: true,
      maxLineLength:1000
    }
  ), { encoding: 'utf8' });
}

function updateDictrItems() {
  const dicPath = 'extra/d/'
  const dateString = (new Date).toISOString()
  const SitemapIndices = []
  const SitemapHTMLIndices = []

  const createBase = (lang, chars) => {
    for (c of chars.split('')) {
      fs.mkdirSync(`${dicPath}${lang}/`, { recursive: true });
      fs.writeFileSync(`${dicPath}${lang}/${c}.xml`, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
      fs.writeFileSync(`${dicPath}${lang}/${c}.html`, `<html><body dir="rtl"><h1>لیست کلمات موجود در دیکشنری با آغاز از «${c}»</h1><ol>`)
      SitemapIndices.push(`<sitemap><loc>https://targoman.ir/d/${lang}/${c}.xml.gz</loc></sitemap>`)
      SitemapHTMLIndices.push(`<li><a href="https://targoman.ir/d/${lang}/${c}.html"> ${c}</a><br/><li>`)
    }
  }

  const closeSiteMap = (lang, chars) =>{
    for (c of chars.split('')) {
    	fs.appendFileSync(`${dicPath}${lang}/${c}.xml`, `</urlset>`)
      gzipme(`${dicPath}${lang}/${c}.xml`)
      fs.appendFileSync(`${dicPath}${lang}/${c}.html`, `</ol></body></html>`)
    }
  }

  const enChars = "abcdefghijklmnopqrstuvwxyz"
  const faChars = "آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیيؤئيةك"


  createBase('en', enChars)
  createBase('fa', faChars)


  fs.writeFileSync(`${dicPath}/mapindex.xml`, `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${SitemapIndices.join("\n")}
  </sitemapindex>`, { encoding: 'utf8' })

  fs.writeFileSync(`${dicPath}/all.html`, `<html><body dir="rtl"><h1>لیست مداخل دیکشنری با آغاز از:</h1><ol>
  ${SitemapHTMLIndices.join("\n")}
  </ol></body></html>`, { encoding: 'utf8' })

  const readInterface = readline.createInterface({
    input: fs.createReadStream('extra/dic.json'),
    console: true
  });

  let prevEntry = 'en/a/a/'

  const descriptions = [
    'ترگمان، سرویس ترجمه آنلاین و رایگان هوشمند',
    'ترگمان، سرویس ترجمه رایگان و آنلاین هوشمند',
    'ترگمان، سرویس ترجمه متن آنلاین و رایگان هوشمند',
    'ترگمان، سرویس ترجمه متن رایگان و آنلاین هوشمند',
    'ترگمان، سرویس ترجمه روان رایگان و آنلاین هوشمند',
    'ترگمان، سرویس ترجمه انگلیسی به فارسی و معکوس رایگان و آنلاین هوشمند',
    'ترگمان، سرویس ترجمه فارسی به انگلیسی و معکوس رایگان و آنلاین هوشمند',

    'ترگمان، سرویس ترجمه هوشمند آنلاین و رایگان',
    'ترگمان، سرویس ترجمه هوشمند رایگان و آنلاین',
    'ترگمان، سرویس ترجمه هوشمند متن آنلاین و رایگان',
    'ترگمان، سرویس ترجمه هوشمند متن رایگان و آنلاین',
    'ترگمان، سرویس ترجمه هوشمند روان رایگان و آنلاین',
    'ترگمان، سرویس ترجمه هوشمند انگلیسی به فارسی و معکوس رایگان و آنلاین',
    'ترگمان، سرویس ترجمه هوشمند فارسی به انگلیسی و معکوس رایگان و آنلاین',

    'ترگمان، سرویس مترجم آنلاین و رایگان هوشمند',
    'ترگمان، سرویس مترجم رایگان و آنلاین هوشمند',
    'ترگمان، سرویس مترجم متن آنلاین و رایگان هوشمند',
    'ترگمان، سرویس مترجم متن رایگان و آنلاین هوشمند',
    'ترگمان، سرویس مترجم روان رایگان و آنلاین هوشمند',
    'ترگمان، سرویس مترجم انگلیسی به فارسی و معکوس رایگان و آنلاین هوشمند',
    'ترگمان، سرویس مترجم فارسی به انگلیسی و معکوس رایگان و آنلاین هوشمند',

    'ترگمان، سرویس مترجم هوشمند آنلاین و رایگان',
    'ترگمان، سرویس مترجم هوشمند رایگان و آنلاین',
    'ترگمان، سرویس مترجم هوشمند متن آنلاین و رایگان',
    'ترگمان، سرویس مترجم هوشمند متن رایگان و آنلاین',
    'ترگمان، سرویس مترجم هوشمند روان رایگان و آنلاین',
    'ترگمان، سرویس مترجم هوشمند انگلیسی به فارسی و معکوس رایگان و آنلاین',
    'ترگمان، سرویس مترجم هوشمند فارسی به انگلیسی و معکوس رایگان و آنلاین',
  ]

  readInterface.on('line', function (line) {
    if(++counter < 0) return
    const entry = JSON.parse(line.substr(0, line.length - 1));
    entry.key = entry.key.toLowerCase().trim()
    if (entry.lang == 'en' && /^[^a-z].*/.test(entry.key)) return;
    if (entry.lang == 'fa' && faChars.split('').includes(entry.key.substr(0,1)) == false ) return;
    if (/(--+)/.test(entry.key)) return;
    if ([
      'b͙',
    ].includes(entry.key)) return
    let url = `${entry.lang}/${entry.key.replace(' ', '_')}/`
    if(fs.existsSync(dicPath+url)) return
	  fs.mkdirSync(dicPath+url)
    fs.appendFileSync(`${dicPath}${entry.lang}/${entry.key.substr(0, 1)}.xml`,
      `\t<url><loc>https://targoman.ir/d/${url}</loc><lastmod>${dateString}</lastmod><priority>0.8</priority><changefreq>monthly</changefreq></url>\n`
      , { encoding: 'utf8' })


    entry.prevEntry = prevEntry;
    prevEntry = url
    const toLang = entry.lang === 'fa' ? 'انگلیسی' : 'فارسی'

    const getMax3List = (list, joiner) => list.slice(0,3).join(joiner) + (list.length > 3 ? joiner + '...' : '')
    const trItems = [`معانی: «${getMax3List(entry.mean, entry.dir == 'rtl' ? ', ' : '، ')}»`]
    if(entry.synonyms) trItems.push(` مترادف‌ها`)
    if(entry.antonyms) trItems.push(`متضاد‌ها`)
    if(entry.vc) trItems.push(`نکات تصویری`)
    if(entry.related) trItems.push(`عبارات مرتبط`)
    if (entry.relwords) trItems.push(`کلمات مشابه`)
    let description = trItems.slice(0, trItems.length > 1 ? trItems.length - 1 : trItems.length).join('، ')
    description += trItems.length == 1 ? '' : (' و ' + trItems.slice(trItems.length - 1))
    description += ` «${entry.key}» در `
    description += descriptions[Math.floor(Math.random() * descriptions.length)]
    const title = `معنی ${entry.key} به ${toLang}`;

    fs.appendFileSync(`${dicPath}${entry.lang}/${entry.key.substr(0, 1)}.html`,
                      `\t<li><a href="https://targoman.ir/d/${url}">${title}</a></li>\n`
                      , { encoding: 'utf8' })


    render(dicPath + url + 'index.html',
      'src/ui/index.ejs',
      {
      title: `ترگمان - ${title}`,
      description,
      author: "پردازش هوشمند ترگمان - سهامی خاص",
      keywords: `${entry.key},${entry.mean.join(',')}, ترگمان, ترجمه, ترجمه هوشمند, مترجم`,
      stylesheets: ["src/css/style.css"],
      image_alt: `ترگمان - معنی ${entry.key} به ${toLang} | ترجمه ${entry.key} به ${toLang}`,
      url: `https://targoman.ir/d/${url}`,
      imageURL: entry.vc ? 'https://targoman.ir/vc/' + entry.vc : null,
      twitterDesc: description,
      needsScripting: false,
      srcText: entry.key,
      tgtText: entry.mean.slice(0,5).join(entry.dir == 'rtl' ? ', ' : '، '),
      dic: entry,
      })
  });

  readInterface.on('close', () => {
    closeSiteMap('en', enChars)
    closeSiteMap('fa', faChars)
  })
}

updateDictrItems();
