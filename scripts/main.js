
const defaultDelta = 1;
const defaultBigDelta = 10;

var currArr = null;
var colCount, rowCount;

//#region utility functions

Math.clamp = function (val, min, max) {
    return Math.min(max, Math.max(val, min));
};

getRandomArrayItem = function (a) {
    return a[Math.floor(Math.random() * a.length)];
};

Array.compare = function (a1, a2) {
    if (a1.length !== a2.length) return false;
    for (var i in a1) {
        if (a1[i] !== a2[i]) return false;
    }
    return true;
};

function getIntVal(id) {
    return parseInt(document.getElementById(id).value);
}

function getRadioVal(name) {
    return $('input[type=radio][name=' + name + ']:checked').val();
}

function getDirs() {
    let dirs = [];
    $('input[type=checkbox][name=directions]').each((i, el) => {
        if (el.checked) dirs.push(el.value);
    });
    return dirs;
}

function increaseVal($input, amount) {
    $input.val((i, val) => Math.clamp(parseInt(val) + amount, parseInt($input.attr('min')), parseInt($input.attr('max'))));
}

function getRandomDigit() {
    return Math.floor(Math.random() * 10);
}

//#endregion

$(document).ready(() => {

    // set up plus minus fields
    $('.field.plus-minus').each((i, el) => {
        let $el = $(el);
        let input = $el.find('input');
        $el.find('[data-action=decrease]').click(() => increaseVal(input, -defaultDelta));
        $el.find('[data-action=decrease-big]').click(() => increaseVal(input, -defaultBigDelta));
        $el.find('[data-action=increase]').click(() => increaseVal(input, defaultDelta));
        $el.find('[data-action=increase-big]').click(() => increaseVal(input, defaultBigDelta));

        input.blur(ev => {
            if (ev.currentTarget.value === '')
                ev.currentTarget.value = ev.currentTarget.min;

            ev.currentTarget.value = Math.clamp(ev.currentTarget.value, ev.currentTarget.min, ev.currentTarget.max);
        });
    });

    $('.numbers-container').click(numberContainerClicked);

    $stopwatchEl = $('#stopwatch');

    initSelecting();
    initDragging();
});

//#region screens

function returnToSettings() {
    $('.settings-cover').removeClass('out-left');
    $('.pregame-cover').removeClass('out-left').addClass('out-right');
    $('.endgame-cover').addClass('out-right');
    $('.game').removeClass('paused');
    hideSelector();
    pauseStopwatch();
}

function createBoard() {
    colCount = getIntVal('horiz_num_count');
    rowCount = getIntVal('vert_num_count');

    let dirs = getDirs();

    $('[data-setting=width]').text(colCount);
    $('[data-setting=height]').text(rowCount);

    $('[data-dir]').addClass('hidden');
    dirs.forEach(dir => $('[data-dir=' + dir + ']').removeClass('hidden'));

    $('.settings-cover').addClass('out-left');
    $('.pregame-cover').removeClass('out-right');

    currArr = generateArray(colCount, rowCount, dirs);

    $('.numbers').html(currArr.map(a => a.join('')).join('<br>'));

    centerView();
}

function startGame() {
    $('.settings-cover, .pregame-cover').addClass('out-left');
    $('.game').removeClass('paused');

    startStopwatch();
}

function showFailFlash() {
    let ff = $('<div/>').addClass('fail-flash');

    let colW = numW / colCount;
    let rowH = numH / rowCount;
    let ffpos = Vector.add(Vector.add(currSelTr, selTrOffset), new Vector(colW / 2, rowH / 2));

    ff.css({
        left: ffpos.x + 'px',
        top: ffpos.y + 'px'
    });

    ff.appendTo('.numbers-container');
    setTimeout(() => ff.remove(), 400);
}

function showEndScreen() {
    stopStopwatch();
    let totalElapsed = Date.now() - stopwatchStartTime + stopwatchPrevDuration;
    $('.result-time').text(formatDuration(totalElapsed));
    $('.endgame-cover').removeClass('out-right');
}

//#endregion

//#region board mechanics

function generateArray(w, h, dirs) {

    var a = [];

    for (let r = 0; r < h; r++) {

        let row = [];
        a.push(row);

        for (let c = 0; c < w; c++) {

            row.push(getRandomDigit());
            while (!isDigitOk(a, r, c, w, dirs))
                row[c] = getRandomDigit();
        }

    }

    // the array should contain no 2137s
    // add a 2137 depending on the difficulty
    generate2137(a, w, h, dirs);

    return a;
}

function isDigitOk(a, r, c, w, dirs) {
    let res = true;

    for (let i in dirs) {
        res &= !checkFor2137InDir(a, r, c, w, dirs[i]);
    }

    return res;
}

function checkFor2137InDir(a, r, c, w, dir) {

    let compareAgainst = [2, 1, 3, 7];
    let l = compareAgainst.length;
    let extracted = [];
    let ignoreComparison = false;

    if (a[r][c] !== compareAgainst[l - 1] && a[r][c] !== compareAgainst[0]) return false;

    switch (dir) {

        case 'l':
            compareAgainst.reverse();
        case 'r':
            if (c < 3 || a[r][c] !== compareAgainst[l - 1]) ignoreComparison = true;
            else
                for (let i = compareAgainst.length - 1; i >= 0; i--)
                    extracted.push(a[r][c - i]);
            break;

        case 'u':
            compareAgainst.reverse();
        case 'd':
            // vertical
            if (r < 3 || a[r][c] !== compareAgainst[l - 1]) ignoreComparison = true;
            else
                for (let i = l - 1; i >= 0; i--)
                    extracted.push(a[r - i][c]);
            break;

        case 'dl':
            compareAgainst.reverse();
        case 'ur':
            // diagonal up
            if (r < 3 || c > w - (l - 1) || a[r][c] !== compareAgainst[l - 1]) ignoreComparison = true;
            else
                for (let i = l - 1; i >= 0; i--)
                    extracted.push(a[r - i][c + (l - 1 - i)]);
            break;

        case 'ul':
            compareAgainst.reverse();
        case 'dr':
            console.log(r, c, a[r][c]);
            // diagonal down
            if (r < 3 || c > w - (l - 1) || a[r][c] !== compareAgainst[l - 1]) ignoreComparison = true;
            else
                for (let i = l - 1; i >= 0; i--)
                    extracted.push(a[r - i][c - i]);
            break;
    }

    if (ignoreComparison) return false;

    return Array.compare(extracted, compareAgainst);
}

function generate2137(a, w, h, dirs) {

    let dir = getRandomArrayItem(dirs);

    let c = Math.floor(Math.random() * (w - 3)),
        r = Math.floor(Math.random() * (h - 3));

    let insert = [2, 1, 3, 7];

    switch (dir) {

        case 'l':
            insert.reverse();
        case 'r':
            // horizontal
            for (let i = 0; i < insert.length; i++)
                a[r][c + i] = insert[i];

            break;

        case 'u':
            insert.reverse();
        case 'd':
            // vertical
            for (let i = 0; i < insert.length; i++)
                a[r + i][c] = insert[i];

            break;

        case 'dl':
            insert.reverse();
        case 'ur':
            // diagonal up

            r += insert.length - 1;
            for (let i = 0; i < insert.length; i++)
                a[r - i][c + i] = insert[i];

            break;
        case 'ul':
            insert.reverse();
        case 'dr':
            // diagonal down
            for (let i = 0; i < insert.length; i++)
                a[r + i][c + i] = insert[i];

            break;
    }
}

//#endregion

//#region vector

class Vector {

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    clampX(min, max) {
        return new Vector(Math.clamp(this.x, min, max), this.y);
    }

    clampY(min, max) {
        return new Vector(this.x, Math.clamp(this.y, min, max));
    }

    multiply(n) {
        return Vector.multiply(this, n);
    }

    divide(n) {
        return Vector.divide(this, n);
    }

    toString() {
        return this.x.toFixed(2) + '\t' + this.y.toFixed(2);
    }

    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }

    static substract(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }

    static multiply(v1, n) {
        return new Vector(v1.x * n, v1.y * n);
    }

    static divide(v1, n) {
        return new Vector(v1.x / n, v1.y / n);
    }

    static dist(v1, v2) {
        return Math.sqrt((v2.x - v1.x) * (v2.x - v1.x) + (v2.y - v1.y) * (v2.y - v1.y));
    }

    static halfway(v1, v2) {
        return new Vector((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
    }

}


//#endregion

//#region selection mechanics

var $sel, $selDir;
var selTrOffset = new Vector(-1, -2);
var currSelTr = new Vector(0, 0);
var currSelSc = 1;
var currSel = { r: -1, c: -1 };

function initSelecting() {

    $sel = $('.selector');
    $selDir = $('.selector-direction');

    $selDir.find('.btn-icon').click(selectorDirectionClicked);
}

function numberContainerClicked(ev) {

    let pos = new Vector(ev.clientX, ev.clientY);
    let relpos = Vector.substract(pos, currTr);

    let colW = numW / colCount * currSc;
    let rowH = numH / rowCount * currSc;

    let r = Math.floor(relpos.y / rowH);
    let c = Math.floor(relpos.x / colW);

    if (r < 0 || c < 0) return;

    currSel = { r, c };

    console.log(c * colW / currSc, r * rowH / currSc);
    setSelectorTranslation(new Vector(c * colW / currSc, r * rowH / currSc));
    showSelector();
}

function selectorDirectionClicked(ev) {
    let $el = $(ev.currentTarget);
    let dir = $el.data('dir');

    let smc = 0;
    if (dir.includes('r')) smc = 1;
    else if (dir.includes('l')) smc = -1;

    let smr = 0;
    if (dir.includes('u')) smr = -1;
    else if (dir.includes('d')) smr = 1;

    console.log(smc, smr);

    let extracted = [];

    if (smc === 0) {
        for (let r = 0; Math.abs(r) < Math.abs(smr * 4); r += smr) {
            extracted.push(parseInt(currArr[currSel.r + r][currSel.c]));
        }
    } else if (smr === 0) {
        for (let c = 0; Math.abs(c) < Math.abs(smc * 4); c += smc) {
            extracted.push(parseInt(currArr[currSel.r][currSel.c + c]));
        }
    } else {
        for (let r = 0, c = 0; Math.abs(r) < Math.abs(smr * 4); r += smr, c += smc) {
            extracted.push(parseInt(currArr[currSel.r + r][currSel.c + c]));
        }
    }

    console.log('extracted', extracted);

    if (Array.compare(extracted, [2, 1, 3, 7]))
        showEndScreen();
    else
        showFailFlash();
}

function setSelectorTranslation(tr) {
    currSelTr = tr;
    updateSelectorTransformAndScale();
}

function setSelectorScale(s) {
    currSelSc = s;
    updateSelectorTransformAndScale();
}

function showSelector() {
    $sel.removeClass('hidden');
    $selDir.removeClass('hidden');
    $selDir.children('.btn-icon').removeClass('hidden');

    if (currSel.r < 3) {
        // hide up
        $selDir.find('[data-dir=ul],[data-dir=u],[data-dir=ur]').addClass('hidden');
    } else if (currSel.r > rowCount - 4) {
        // hide down
        $selDir.find('[data-dir=dl],[data-dir=d],[data-dir=dr]').addClass('hidden');
    }

    if (currSel.c < 3) {
        // hide left
        $selDir.find('[data-dir=ul],[data-dir=l],[data-dir=dl]').addClass('hidden');
    } else if (currSel.c > colCount - 4) {
        // hide right
        $selDir.find('[data-dir=ur],[data-dir=r],[data-dir=dr]').addClass('hidden');
    }

}

function hideSelector() {
    $sel.addClass('hidden');
    $selDir.addClass('hidden');
}

function updateSelectorTransformAndScale() {
    $sel.css('transform', 'translate(' + (currSelTr.x + selTrOffset.x) + 'px, ' + (currSelTr.y + selTrOffset.y) + 'px)');

    let dirPos = Vector.add(currTr, currSelTr.multiply(currSc));
    let colW = numW / colCount * currSc;
    let rowH = numH / rowCount * currSc;
    $selDir.css('transform', 'translate(' + (dirPos.x + colW / 2 + selTrOffset.x) + 'px, ' + (dirPos.y + rowH / 2 + selTrOffset.y) + 'px)');
}

//#endregion

//#region drag and zoom

const minScale = 0.6;
const maxScale = 3;
const scaleStep = 0.2;

var $dc, dc, $nc;
var currTr = new Vector(0, 0);
var currTo = new Vector(0, 0);
var currSc = 1;
var dragW, dragH, numW, numH, numS;

function initDragging() {
    $dc = $('.drag-container');
    dc = $dc.get(0);
    $nc = $('.numbers-container');

    // mouse events
    dc.addEventListener('mousedown', mDown);
    dc.addEventListener('mousemove', mMove);
    dc.addEventListener('mouseup', mUp);
    dc.addEventListener('mouseleave', mUp);
    dc.addEventListener('wheel', wheel);

    // touch events
    dc.addEventListener('touchstart', tStart);
    dc.addEventListener('touchmove', tMove);
    dc.addEventListener('touchend', tEnd);

    window.addEventListener('resize', wResize);

    setTransformOrigin(currTo);
}

function wResize() {
    updateDragSizes();
}

//#region utility functions

function setTranslation(t) {
    currTr = t;
    limitCurrTr();
    updateSelectorTransformAndScale();
    updateTransformAndScale();
}

function setScale(s) {
    currSc = s;
    limitCurrTr();
    updateSelectorTransformAndScale();
    updateTransformAndScale();
}

function updateTransformAndScale() {
    $nc.css('transform', 'translate(' + currTr.x + 'px, ' + currTr.y + 'px) scale(' + currSc + ')');
}

function setTransformOrigin(to) {
    $nc.css('transform-origin', to.x + 'px ' + to.y + 'px');
    currTo = to;
}

function updateDragSizes() {

    numW = $nc.innerWidth();
    numH = $nc.innerHeight();
    numS = new Vector(numW, numH);
    dragW = $dc.width();
    dragH = $dc.height();

    setTranslation(currTr);
}

function centerView() {
    updateDragSizes();
    setTranslation(new Vector((dragW - numW) / 2, (dragH - numH) / 2));
    setSelectorTranslation(currSelTr);
}

//#endregion

//#region translation limits

function getMinTrX() {
    return dragW / 2 - (numW - currTo.x) * currSc - currTo.x;
}

function getMaxTrX() {
    return dragW / 2 + currTo.x * (currSc - 1);
}

function getMinTrY() {
    return dragH / 2 - (numH - currTo.y) * currSc - currTo.y;
}

function getMaxTrY() {
    return dragH / 2 + currTo.y * (currSc - 1);
}

function limitCurrTr() {
    currTr = currTr.clampX(getMinTrX(), getMaxTrX()).clampY(getMinTrY(), getMaxTrY());
}

//#endregion

//#region touch

const distPerScaleStep = 40;

var t1ID = null, t2ID = null;
var t1LastPos = null, t1StartPos = null, t1StartTr = null;

var t2StartDist = null, t2StartSc = null;

function tStart(ev) {

    // dismiss selector on zoom change
    hideSelector();

    for (let i in ev.touches) {
        let t = ev.touches[i];

        if (t1ID === null) {
            t1ID = t.identifier;
            t1LastPos = t1StartPos = new Vector(t.clientX, t.clientY);
            t1StartTr = currTr;

            console.log('t1 - start');

            break;
        }

        if (t2ID === null && t.identifier !== t1ID) {
            t2ID = t.identifier;
            t2StartDist = Vector.dist(t1LastPos, new Vector(t.clientX, t.clientY));
            t2StartSc = currSc;
            console.log('t2 - start');
        }
    }

    //ev.preventDefault();
}

function tMove(ev) {

    for (let i in ev.touches) {
        let t = ev.touches[i];

        if (t.identifier === t1ID && t2ID === null) {

            // drag
            t1LastPos = new Vector(t.clientX, t.clientY);
            let delta = Vector.substract(t1LastPos, t1StartPos);
            setTranslation(Vector.add(t1StartTr, delta));


            break;
        }

        if (t1ID !== null && t.identifier === t2ID) {

            // pinch
            let pos = new Vector(t.clientX, t.clientY);
            let dist = Vector.dist(t1LastPos, pos);
            let distdelta = dist - t2StartDist;
            let distSteps = distdelta / distPerScaleStep;
            let newSc = t2StartSc + distSteps * scaleStep;

            // zoom around midpoint
            let o = Vector.halfway(t1LastPos, pos);
            let relO = Vector.substract(o, currTr);

            // get original x distance
            let ogO = Vector.divide(relO, currSc);
            // get new distance based on original distance
            let newO = ogO.multiply(newSc);
            // get difference between current and new
            let diff = Vector.substract(newO, relO);

            if (newSc > minScale && newSc < maxScale)
                setTranslation(Vector.substract(currTr, diff));

            setScale(Math.clamp(newSc, minScale, maxScale));

        }
    }

    ev.preventDefault();
}

function tEnd(ev) {

    if (ev.touches.length === 0) {

        console.log('all touches - end');
        t1ID = t2ID = null;
    }

    for (let i in ev.touches) {
        let t = ev.touches[i];


        if (t.identifier === t1ID) {
            console.log('t1 - end');
            t1ID = null;
        }

        if (t.identifier === t2ID) {
            console.log('t2 - end');
            t2ID = null;
        }
    }

    //ev.preventDefault();
}

//#endregion

//#region mouse

var mIsDown = false;
var mDragStartTr, mDragStartPos;

function mDown(ev) {
    mIsDown = true;
    mDragStartTr = currTr;
    mDragStartPos = new Vector(ev.clientX, ev.clientY);

    // dismiss selector on drag start
    hideSelector();
}

function mMove(ev) {
    if (mIsDown) {
        let pos = { x: ev.clientX, y: ev.clientY };
        let delta = Vector.substract(pos, mDragStartPos);

        requestAnimationFrame(() => {
            setTranslation(Vector.add(mDragStartTr, delta));
        });
    }
}

function mUp(ev) {
    mIsDown = false;
}

function wheel(ev) {

    // dismiss selector on zoom change
    hideSelector();

    var newSc = Math.clamp(currSc + Math.sign(ev.deltaY) * -1 * scaleStep, minScale, maxScale);

    let m = new Vector(ev.clientX, ev.clientY);
    let relm = Vector.substract(m, currTr);

    // get original x distance
    let ogM = Vector.divide(relm, currSc);
    // get new distance based on original distance
    let newM = ogM.multiply(newSc);
    // get difference between current and new
    let diff = Vector.substract(newM, relm);

    setTranslation(Vector.substract(currTr, diff));

    setScale(newSc);
}

//#endregion

//#endregion

//#region stopwatch

var stopwatchIntervalId, stopwatchStartTime, $stopwatchEl, stopwatchPrevDuration;

function startStopwatch() {
    stopwatchIntervalId = setInterval(updateStopwatchUI, 9);
    stopwatchPrevDuration = 0;
    stopwatchStartTime = Date.now();
    updatePauseUI();
}

function updateStopwatchUI() {
    let elapsed = Date.now() - stopwatchStartTime + stopwatchPrevDuration;
    $stopwatchEl.text(formatDuration(elapsed));
}

function formatDuration(d) {
    let h = Math.floor(d / 1000 / 60 / 60);
    let m = Math.floor(d / 1000 / 60) % 60;
    let s = Math.floor(d / 1000) % 60;
    let ms = d % 1000;

    return h + ':' + m.toString().padStart(2, 0) + ':' + s.toString().padStart(2, 0) + '.' + ms.toString().padStart(3, 0);
}

function pauseStopwatch() {
    clearInterval(stopwatchIntervalId);
    stopwatchIntervalId = null;
    stopwatchPrevDuration += Date.now() - stopwatchStartTime;
    updatePauseUI();
}

function resumeStopwatch() {
    stopwatchIntervalId = setInterval(updateStopwatchUI, 9);
    stopwatchStartTime = Date.now();
    updatePauseUI();
}

function stopStopwatch() {
    clearInterval(stopwatchIntervalId);
    stopwatchIntervalId = null;
}

function toggleStopwatch() {
    if (stopwatchIntervalId)
        pauseStopwatch();
    else
        resumeStopwatch();
}

function updatePauseUI() {
    if (stopwatchIntervalId) {
        $('.game').removeClass('paused');
        $('#pause').children('i.mdi')
            .addClass('mdi-pause')
            .removeClass('mdi-play-outline');
    } else {
        $('.game').addClass('paused');
        $('#pause').children('i.mdi')
            .removeClass('mdi-pause')
            .addClass('mdi-play-outline');
    }
}

//#endregion