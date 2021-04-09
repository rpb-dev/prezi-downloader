const yargs = require('yargs');
const puppeteer = require('puppeteer');
var fs = require('fs');
const PDFDocument = require('pdfkit');

const argv = yargs
    .command('download', 'Downloads a Prezi presentation from url', {
        download: {
            description: 'Downloads a Prezi presentation',
            alias: 'u',
            type: 'string',
        }
    })
    .usage('Usage: $0 download [url] [options]')
    .option('width', {
        alias: 'w',
        description: 'Width of the browser page',
        type: 'number',
        default: 1920
    })
    .option('height', {
        alias: 'h',
        description: 'Height of the browser page',
        type: 'number',
        default: 1080
    })
    .option('delay', {
        alias: 'd',
        description: 'Delay the browser actions in x amount of milliseconds',
        type: 'number',
        default: 0
    })
    .option('background', {
        alias: 'b',
        description: 'Will the downloader hide itself?',
        type: 'boolean',
        default: 'false'
    })
    .help()
    .alias('help', 'h')
    .demand(1)
    .argv;


if (argv._.includes('download')) {
    argv._.shift()
    var url = argv._;
    console.log(argv._)
    if (url.length > 0) {
        console.log(`Downloading ${url[0]}`);
        donwloadPages(url[0]);
    } else {
        console.log("Too many args")
    }
}

function donwloadPages(url) {
    var currentPage = 0;
    var width = argv.width ? argv.width : 1920;
    var height = argv.height ? argv.height : 1080;
    var delay = argv.delay ? argv.delay : 0;
    var background = argv.background == 'true';
    console.log(background);
    (async () => {
        const browser = await puppeteer.launch({
            defaultViewport: { width: width, height: height },
            headless: background,
            slowMo: 300 + delay, // slow down by 250ms
        });
        const page = await browser.newPage();


        await page.goto(url, {
            waitUntil: 'networkidle2',
        });

        var title = await page.title();
        var illegalRe = /[\/\?<>\\:\*\|":]/g;
        title = title.replace(illegalRe, "-");
        if (!fs.existsSync(`Downloads`)) {
            fs.mkdirSync(`Downloads`);
        }
        if (!fs.existsSync(`Downloads/${title}`)) {
            fs.mkdirSync(`Downloads/${title}`);
        }

        await page.click('.viewer-common-info-overlay-button-icon');
        await page.waitForSelector("#webgl-viewer-app > div.webgl-viewer-ui-container > div.webgl-viewer-navbar-container > div > div.webgl-viewer-navbar-button-container > div.webgl-viewer-navbar-right > button", { timeout: 5000 });
        await page.click('.webgl-viewer-navbar-fullscreen-enter-icon', { timeout: 5000 });
        try {
            while (currentPage >= 0) {
                await page.screenshot({ path: `./Downloads/${title}/${currentPage}.png` }); // Screenshot page
                console.log(`Fetching page ${(currentPage + 1)}`)
                currentPage++;
                try {
                    const element = await page.waitForSelector('#viewer-container > div > span > div > div.viewer-common-info-overlay-foreground > div.viewer-common-info-overlay-centering > div > div > div.viewer-common-info-overlay-button-label', { timeout: 2000 }); // select the element
                    const value = await element.evaluate(el => el.textContent); // grab the textContent from the element, by evaluating this function in the browser context
                } catch (err) {
                    await page.keyboard.press('ArrowRight');
                    continue;
                }
                throw 'Finished Fetching'
            }

        } catch (error) {
            console.log(error);
            await browser.close();
            createPdf(`Downloads/${title}`, title,width)
        }
    })();
}

function createPdf(imagesPath, title,width) {
    console.log("Converting to PDF");
    doc = new PDFDocument({ layout: 'landscape' });
    doc.pipe(fs.createWriteStream(`${title}.pdf`))
    fs.readdir(imagesPath, async function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            await doc.addPage({
                margins: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                  },
                layout: 'landscape',
                size: 'A4'
            })

            await doc.image(`${imagesPath}/${file}`, {fit: [842, 595], align: 'center', valign: 'center'});
        }
        doc.end();
    });


}