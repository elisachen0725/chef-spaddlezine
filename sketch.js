/*
  Chef’s Paddle – p5.(gen)zine
  Pages: cover | spread one | spread two | spread three | back
  (every spread is 2 pages side by side = 8 printed pages in total)

  Don’t name your own functions coverPage / onePage / twoPage / threePage / backPage
  or coverDraw / oneDraw ...: the library calls those by name every frame.
*/

const zine = {
  title: "Chef’s Paddle",
  author: "Elisa Chen",
  description:
    "The recipe for Pong: a sandwich recipe book that is also a Bluetooth controller for DF Pong. " +
    "Flip to a new page and the colour in front of the sensor moves your paddle. " +
    "ESP32 Feather V2 + APDS9999 · DIGF-6037 Creation & Computation.",
  frameRate: 20,   // smoother hover demo
  cam: false       // we don’t need the webcam (the library asks for it unless this is false)
};

// ---------- layout: everything is drawn on a 550 × 850 page, then scaled to the library’s page size ----------
const PW = 550, PH = 850, X0 = 70, CW = 410;
const CONTROLLER = 6;
const C = {
  paper: '#fff8ec', ink: '#2b2118', title: '#f3e14a', crust: '#c98a5a',
  lettuce: '#1f8a64', cheese: '#f6dc3c', tomato: '#d9242b', toast: '#e9a982'
};

// colour rules from the Arduino sketch: pos 0 = paddle top, 50 = middle, 100 = bottom
const METHOD_ROWS = [
  { col: C.lettuce, name: 'Lettuce page', rule: 'R/G ≤ 0.80 and G ≥ 690', result: 'Paddle goes TOP', pos: 0 },
  { col: C.cheese,  name: 'Cheese page',  rule: 'R/G between 0.81 and 0.82', result: 'Paddle stays MIDDLE', pos: 0.5 },
  { col: C.tomato,  name: 'Tomato page',  rule: 'R/G above 0.82', result: 'Paddle goes BOTTOM', pos: 1 }
];

const SHOW_BOX = false;   // true = 顯示白色框，false = 不要框
let textCol = C.ink;      // 目前這一頁的文字顏色
const ING = {
  feather: { bg: 'lettuce', ic: 'feather', t: 'Adafruit ESP32 Feather V2',
    what: 'The central processing unit and wireless module of the controller.',
    how: ['Reads the colour sensor over I2C through a STEMMA QT cable.',
          'Turns the red-to-green colour ratio into a paddle position.',
          'Acts as a Bluetooth Low Energy peripheral, sending live positions to the DF Pong game.'] },
  cable: { bg: 'cheese', ic: 'cable', t: 'STEMMA QT Cable',
    what: 'A 4-pin modular I2C cable (power, ground, SDA, SCL) for plug-and-play connections.',
    how: ['Connects the Feather directly to the APDS9999 sensor, with no soldering.',
          'Keeps the data line from rattling loose or dropping power during a game.'] },
  battery: { bg: 'tomato', ic: 'battery', t: '3.7V LiPo Battery',
    what: 'A rechargeable lithium polymer battery that supplies portable power.',
    how: ['Plugs into the JST-PH port on the Feather.',
          'Tucked in the hidden enclosure behind the book, so the controller stays 100% wireless.',
          'Keeps play going through the whole playtest, with no wall outlet.'] },
  apds: { bg: 'toast', ic: 'apds', t: 'Adafruit APDS9999 Sensor',
    what: 'An optical sensor that measures red, green, blue, infrared and clear light, and how close an object is.',
    how: ['Reads the light reflected from the coloured pages as they are flipped.',
          'The code works out a Red ÷ Green ratio, which stays steady when the page distance changes.'] }
};

let chefHatImg, sandwichImg;
function preload() {
  chefHatImg = loadImage('chef-hat.png'); // 廚師帽圖片
  sandwichImg = loadImage('sandwich.png'); // 三明治圖片（請記得上傳 sandwich.png）
}

if (chefHatImg) {
    g.imageMode(CENTER);
    // (X座標, Y座標, 寬度, 高度)
    // 380 靠右，620 往下移到右下方，寬高設為 380x380 (約佔頁面三分之一)
    g.image(chefHatImg, 420, 650, 320, 320); 
  }

let K, toastTex;
let paddleY = 0.5, paddleTarget = 0.5;

function setupPage() {
  K = pWidth / PW;                                   // pWidth comes from the library (800)
  toastTex = createGraphics(pWidth, pHeight);        // toast texture, built once and reused
  toastTex.pixelDensity(1);
  toastTex.scale(K);
  zToastBuild(toastTex);
}

function drawPage() {
  // hover demo on method page (Spread one, right page): the paddle follows the row under the mouse
  const mx = (one.mouseX - pWidth) / K, my = one.mouseY / K;
  METHOD_ROWS.forEach((r, j) => {
    const y = 500 + j * 105;
    if (mx > X0 - 10 && mx < PW - 90 && my > y - 12 && my < y + 78) paddleTarget = r.pos;
  });
  paddleY = lerp(paddleY, paddleTarget, 0.25);

  /* Cover (第 1 頁) */
  cover.push(); cover.scale(K); zCoverArt(cover); cover.pop();

  /* Spread one: recipe card (左) | The Method (右 - 緊接在 Recipe Card 後面) */
  one.background(C.paper);
  zHalf(one, 0, zIntro);
  zHalf(one, 1, zMethod);

  /* Spread two: ESP32 (左) | STEMMA QT Cable (右) */
  two.background(C.paper);
  zHalf(two, 0, g => zIngredient(g, ING.feather));
  zHalf(two, 1, g => zIngredient(g, ING.cable));

  /* Spread three: 3.7V LiPo Battery (左) | APDS9999 Sensor (右) */
  three.background(C.paper);
  zHalf(three, 0, g => zIngredient(g, ING.battery));
  zHalf(three, 1, g => zIngredient(g, ING.apds));

  /* Back cover */
  back.push(); back.scale(K); zBackArt(back); back.pop();
}

// draw one page of a spread: side 0 = left, 1 = right
function zHalf(g, side, fn) {
  g.push();
  g.translate(side * pWidth, 0);
  g.scale(K);
  fn(g);
  g.pop();
}

// ---------- helpers ----------
function zLines(g, s, w) {
  const out = []; let l = '';
  for (const word of s.split(' ')) {
    const t = l ? l + ' ' + word : word;
    if (g.textWidth(t) > w && l) { out.push(l); l = word; } else l = t;
  }
  out.push(l); return out;
}

// white rounded sticker label, like the ones on the paper pages; returns its bottom y
function zLabel(g, s, x, y, w, o = {}) {
  const sz = o.size || 20, lh = sz * 1.3;
  g.textFont('Georgia'); g.textSize(sz); g.textStyle(o.style || NORMAL);
  const L = (Array.isArray(s) ? s : [s]).flatMap(p => zLines(g, p, w - 28)), h = L.length * lh + 20;
  if (SHOW_BOX) { g.stroke(0, 40); g.strokeWeight(1.5); g.fill(255, 245); g.rect(x, y, w, h, 18); }
g.noStroke(); g.fill(o.col || textCol);
  const ctr = o.align === CENTER; g.textAlign(ctr ? CENTER : LEFT, TOP);
  L.forEach((t, i) => g.text(t, ctr ? x + w / 2 : x + 14, y + 10 + i * lh));
  return y + h;
}

function zPaper(g) { g.noStroke(); g.fill(C.paper); g.rect(0, 0, PW, PH); }

function zHoles(g) {   // the 3 book-ring holes
  g.stroke(150); g.strokeWeight(2); g.fill(C.paper);
  [0.25, 0.5, 0.75].forEach(f => g.circle(46, PH * f, 22));
}

function zTpath(c, x, y, w, h) {   // toast silhouette
  c.beginPath(); c.moveTo(x + w * .12, y + h * .03);
  c.bezierCurveTo(x - w * .06, y, x - w * .04, y + h * .2, x + w * .06, y + h * .2);
  c.lineTo(x + w * .06, y + h * .92); c.quadraticCurveTo(x + w * .06, y + h, x + w * .16, y + h);
  c.lineTo(x + w * .84, y + h); c.quadraticCurveTo(x + w * .94, y + h, x + w * .94, y + h * .92);
  c.lineTo(x + w * .94, y + h * .2);
  c.bezierCurveTo(x + w * 1.04, y + h * .2, x + w * 1.06, y, x + w * .88, y + h * .03);
  c.quadraticCurveTo(x + w * .5, y - h * .03, x + w * .12, y + h * .03); c.closePath();
}

function zToastBuild(g) {
  g.background(C.paper);
  const c = g.drawingContext, gr = c.createRadialGradient(PW / 2, PH * .4, 40, PW / 2, PH * .4, PH * .6);
  gr.addColorStop(0, '#f6c9a3'); gr.addColorStop(1, '#e59a78');
  c.save(); zTpath(c, 20, 20, PW - 40, PH - 40);
  c.fillStyle = gr; c.fill(); c.lineWidth = 12; c.strokeStyle = C.crust; c.stroke(); c.clip();
  g.noStroke(); randomSeed(7);
  for (let i = 0; i < 450; i++) { g.fill(190, 100, 80, random(15, 45)); g.circle(random(PW), random(PH), random(2, 10)); }
  c.restore();
}
function zToast(g) { g.image(toastTex, 0, 0, PW, PH); }

function zColorPage(g, bg) {
  zPaper(g); g.noStroke(); g.fill(C[bg]);
  if (bg === 'lettuce') {
    g.beginShape(); g.vertex(20, 20);
    for (let y = 20; y <= PH - 20; y += 10) g.vertex(PW - 24 - 26 * Math.abs(Math.sin(y / 42)), y);   // Math.sin: the library sets angleMode(DEGREES)
    g.vertex(20, PH - 20); g.endShape(CLOSE);
  } else if (bg === 'cheese') {
    g.rect(20, 20, PW - 40, PH - 40, 6);
    g.fill('#e8c52a'); [[300, 200, 30], [200, 620, 22], [440, 470, 18]].forEach(p => g.circle(p[0], p[1], p[2] * 2));
    g.fill(C.paper); [260, 560].forEach(y => g.circle(PW - 20, y, 64));
  } else g.rect(20, 20, PW - 40, PH - 40, 0, 300, 300, 0);   // tomato slice
}

function zIcon(g, k, cx, cy) {
  g.stroke(0, 40); g.strokeWeight(1.5); g.fill(255); g.rect(cx - 150, cy - 95, 300, 190, 36);
  
  g.push(); g.translate(cx, cy); g.noStroke();
  if (k === 'feather') {
    g.fill('#6c2a86'); g.rect(-110, -42, 220, 84, 8); g.fill(30); g.rect(10, -32, 80, 64, 4);
    g.fill(235); g.rect(-100, -30, 34, 26, 3); g.fill('#e8c25a');
    for (let i = 0; i < 12; i++) { g.circle(-96 + i * 17, -36, 6); g.circle(-96 + i * 17, 36, 6); }
  } else if (k === 'cable') {
    g.noFill(); g.stroke(25); g.strokeWeight(8); g.bezier(-100, 30, -90, -70, 90, -70, 100, 30);
    g.fill(240); g.strokeWeight(2); g.rect(-114, 24, 28, 22, 3); g.rect(86, 24, 28, 22, 3);
  } else if (k === 'battery') {
    g.fill(235); g.stroke(150); g.strokeWeight(2); g.rect(-70, -45, 140, 90, 12);
    g.noStroke(); g.fill('#f2c230'); g.rect(-70, 10, 40, 35, 8);
    g.noFill(); g.stroke(200, 30, 30); g.strokeWeight(4); g.line(70, -20, 100, -40);
    g.stroke(20); g.line(70, -10, 100, -20);
  } else {
    g.fill(35); g.rect(-70, -55, 140, 110, 10); g.fill('#e8c25a');
    [[-52, -37], [52, -37], [-52, 37], [52, 37]].forEach(p => g.circle(p[0], p[1], 14));
    g.fill(255); g.textAlign(CENTER, CENTER); g.textStyle(BOLD); g.textSize(14); g.text('APDS-9999', 0, 0);
  }
  g.pop();
}

// ---------- the pages ----------
function zCoverArt(g) {
  zPaper(g); // 乾淨紙張背景
  zHoles(g);
  g.textFont('Georgia');

  // 右下方廚師帽圖片
  if (chefHatImg) {
    g.imageMode(CENTER);
    g.image(chefHatImg, 400, 550, 420, 570); 
  }

  // 左側大字群組（靠左對齊，X 軸對齊 X0）
  g.textAlign(LEFT, TOP);

  // 第一行小標：2026 FALL DF PONG
  g.noStroke(); 
  g.fill(C.tomato); 
  g.textStyle(BOLD); 
  g.textSize(80);
  g.text('2026', X0, 100);
  g.text('FALL', X0, 180);
  g.text('DF ', X0, 260);
   g.text('PONG', X0, 340);

  // 第二行主標：Chef’s Paddle（你可以修改這裡的 270 和 335 來控制與上一行的距離）
  g.fill(C.title); 
  g.stroke('#1d4fa8'); 
  g.strokeWeight(5); 
  g.strokeJoin(ROUND);
  g.textStyle(BOLDITALIC); 
  g.textSize(80);
  g.text('Chef’s', X0, 470);
  g.text('Paddle', X0, 530);

  // 最下方小一點的字：Ying-Hsuan Elisa Chen
  g.noStroke(); 
  g.fill(C.ink); 
  g.textStyle(NORMAL); 
  g.textSize(20);
  g.text('OCAD University\nYing-Hsuan Elisa Chen', X0, 660);

}

function zIntro(g) {
  zPaper(g); zHoles(g); g.textFont('Georgia');
  g.noStroke(); g.textAlign(LEFT, TOP); g.fill(C.tomato); g.textStyle(BOLD); g.textSize(15);
  g.text('RECIPE CARD · SERVES 2 PLAYERS', X0, 90);
  g.fill(C.ink); g.textStyle(BOLDITALIC); g.textSize(46); g.text('Chef’s Paddle', X0, 128);
  g.textStyle(ITALIC); g.textSize(19);
  zLines(g, 'A Bluetooth controller for DF Pong, built as a sandwich recipe book on a tabletop easel. Flip a page and the colour in front of the sensor moves your paddle. No buttons, just lunch.', CW)
    .forEach((t, i) => g.text(t, X0, 200 + i * 26));
  g.textStyle(BOLD); g.textSize(26); g.text('Ingredients', X0, 345);
  [[C.lettuce, '1  Adafruit ESP32 Feather V2'], [C.cheese, '1  STEMMA QT cable'], [C.tomato, '1  3.7V LiPo battery'],
   [C.toast, '1  Adafruit APDS9999 sensor'], ['#999999', '5  Laser-cut Pages + 3 Book Rings'], ['#8a6a4a', '1  Wooden Tabletop Easel']]
    .forEach((it, j) => {
      const y = 395 + j * 56;
      g.stroke(0, 40); g.strokeWeight(1.5); g.fill(it[0]); g.rect(X0, y, 26, 26, 6);
      g.noStroke(); g.fill(C.ink); g.textStyle(NORMAL); g.textSize(18); g.text(it[1], X0 + 40, y + 3);
      g.stroke(0, 25); g.line(X0, y + 42, PW - 40, y + 42);
    });
  g.noStroke(); g.fill(C.ink); g.textStyle(ITALIC); g.textSize(17); g.text('Prep time: one page flip.', X0, 790);
}

function zIngredient(g, k) {
  if (k.bg === 'toast') zToast(g); else zColorPage(g, k.bg);
  zHoles(g);
  
  let startY = 80;

  // 1. 標題置中
  let y = zLabel(g, k.t, X0, startY, CW, { size: 30, style: BOLDITALIC, col: C.ink, align: CENTER }) + 20;
  
  // 2. 圖片 Icon 置中
  zIcon(g, k.ic, X0 + CW / 2, y + 95); 
  y += 210;
  
  // 3. 「What it is:」標題與內容置中
  y = zLabel(g, 'What it is:', X0, y, CW, { size: 20, style: BOLD, align: CENTER }) + 8;
  y = zLabel(g, k.what, X0, y, CW, { size: 17, align: CENTER }) + 20;
  
  // 4. 「How it works in the project:」標題與條列內容置中
  y = zLabel(g, 'How it works in the project:', X0, y, CW, { size: 20, style: BOLD, align: CENTER }) + 8;
  zLabel(g, k.how.map(s => s), X0, y, CW, { size: 17, align: CENTER });
}

function zMethod(g) {
  zPaper(g); 
  zHoles(g);
  zLabel(g, 'The Method', X0, 72, CW, { size: 40, style: BOLDITALIC, col: C.lettuce, align: CENTER });
  zLabel(g, ['1. Flip a page: a new colour slides in front of the sensor.',
             '2. The APDS9999 reads red (R) and green (G) light.',
             '3. The Feather divides: ratio = R ÷ G, so distance barely matters.',
             '4. The ratio picks a paddle position, sent over Bluetooth as sendPosition(pos, 0, 100).'],
        X0, 160, CW, { size: 19 });
  METHOD_ROWS.forEach((r, j) => {
    const y = 430 + j * 95;
    g.stroke(0, 60); g.strokeWeight(1.5); g.fill(r.col); g.rect(X0+15, y, 64, 64, 12);
    g.noStroke(); g.fill(C.ink); g.textAlign(LEFT, TOP);
    g.textStyle(BOLD); g.textSize(20); g.text(r.name, X0 + 95, y);
    g.textStyle(NORMAL); g.textSize(16); g.text(r.rule, X0 + 95, y + 25); g.text(r.result, X0 + 95, y + 45);
  });
  // little Pong strip: the paddle follows the row you hover (see drawPage)
  const sx = PW - 110, sy = 430, sh = 280, ph = 45;
  g.stroke(255, 60); g.strokeWeight(1); g.fill(24); g.rect(sx, sy, 30, sh, 8);
  g.drawingContext.setLineDash([6, 8]); g.line(sx + 15, sy + 8, sx + 15, sy + sh - 8); g.drawingContext.setLineDash([]);
  g.noStroke(); g.fill('#ffcc00'); g.rect(sx + 5, sy + 4 + paddleY * (sh - ph - 8), 20, ph, 5);
  g.fill(C.ink); g.textAlign(CENTER, TOP); g.textStyle(ITALIC); g.textSize(13); g.text('hover a row', sx + 15, sy + sh + 8);
}

function zBackArt(g) {
  zPaper(g); // ⬅️ 【有更動】拿掉原本的吐司背景，改為乾淨紙張背景
  zHoles(g); 
  g.textFont('Georgia');

  // ⬅️ 【有更動】在正中間放置三明治圖片
  if (sandwichImg) {
    g.imageMode(CENTER);
    g.image(sandwichImg, PW / 2, PH / 2 +25, 320, 320); 
  }

  // 頂部標題
  g.textAlign(CENTER, TOP); 
  g.fill(C.title); 
  g.stroke('#1d4fa8'); 
  g.strokeWeight(5); 
  g.strokeJoin(ROUND);
  g.textStyle(BOLDITALIC); 
  g.textSize(64); 
  g.text('Bon appétit!', PW / 2 + 10, 170);

  // 副標提示
  zLabel(g, 'Flip a page. Move the paddle.', X0, 250, CW, { size: 22, style: ITALIC, align: CENTER });
  
  // 底部製作資訊
  zLabel(g, [
    'DF Pong controller #' + CONTROLLER, 
    'DIGF-6037 · Creation & Computation · Fall 2026', 
    'Made with p5.genzine · ' + zine.author
  ], X0, 630, CW, { size: 16, align: CENTER });
}