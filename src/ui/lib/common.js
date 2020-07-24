function isLineBreakingNode(n) {
    if(n.nodeType === Node.TEXT_NODE)
        return false;
    if(n.nodeName !== 'BR' && getComputedStyle(n).display !== 'block')
        return false;
    if(n.nodeName === 'BR' && n.parentElement.lastChild === n)
        return false;
    let range = document.createRange();
    range.setStart(n.parentElement, 0);
    range.setEnd(n, 0);
    let previousText = range.toString();
    if(n.nodeName !== 'BR' && previousText === '')
        return false;
    range.setStart(n, n.childNodes.length);
    range.setEnd(n.parentElement, n.parentElement.childNodes.length);
    let nextText = range.toString();
    if(previousText === '' && nextText === '')
        return false;
    return true;
}

export function eval_literal(statement) {
    let dummy = new Function('return ' + statement);
    let result;
    try {
        result = dummy();
    } catch {
        // Nothing to do
    }
    return result;
}

export const soon = (function () {
    let promise = null;
    return handle => setTimeout(() => {
        if (promise === null) {
            promise = Promise.resolve().then(function () {
                promise = null;
            });
        }
        promise.then(handle);
    }, 0);
})();

export function jitterPreventedVersion(f) {
    let timeoutHandle = null;
    return function(...args) {
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(() => f(...args), 100);
    }
}

export function getTextContent(e) {
    let result = '';
    let walker = document.createTreeWalker(
        e,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        n => {
            if(n.nodeType === Node.TEXT_NODE)
                result += n.textContent;
            else if(isLineBreakingNode(n))
                result += '\n';
            return NodeFilter.FILTER_SKIP;
        }
    );
    walker.nextNode();
    return result;
}

export function setTextContent(e, value) {
    let lines = value.split('\n');
    if(lines.length === 0) {
        e.textContent = '';
        return;
    }
    e.innerHTML = '';
    if(lines[0] === '' && lines.length > 1) {
        let div = document.createElement('DIV');
        div.appendChild(document.createElement('BR'));
        e.appendChild(div);
    } else
        e.textContent = lines[0];
    for(let line of lines.slice(1)) {
        let div = document.createElement('DIV');
        if(line === '')
            div.appendChild(document.createElement('BR'));
        else
            div.textContent = line;
        e.appendChild(div);
    }
}

export function setTokenizedText(e, tokenizationResult) {
    if(!tokenizationResult) {
        e.innerHTML = '';
        return;
    }
    e.innerHTML = '';
    let parent = null;
    for(let i = 0; i < tokenizationResult.length; ++i) {
        let parTokens = tokenizationResult[i];
        if(!parTokens) {
            let div = document.createElement('DIV');
            div.appendChild(document.createElement('BR'));
            e.appendChild(div);
            continue;
        }
        if(parent === null)
            parent = e;
        else {
            parent = document.createElement('DIV');
            e.appendChild(parent);
        }
        for(var token of parTokens) {
            let newChild;
            if(token.length > 1) {
                newChild = document.createElement('SPAN');
                newChild.classList.add('phrase-token')
                newChild.textContent = token[0];
                newChild.dataset.parIndex = i;
                newChild.dataset.phraseIndex = token[1];
            } else 
                newChild = document.createTextNode(token[0]);
            parent.appendChild(newChild);
        }
    }
}

export function getCursorLineAndPos(e) {
    let cursorLine = null, cursorPos = null;
    let selection = document.getSelection();
    if(!selection.focusNode || !e.contains(selection.focusNode))
        return { cursorLine, cursorPos };
    let focusNode = selection.focusNode;
    let focusOffset = selection.focusOffset;
    if(focusNode === e) {
        if(focusOffset < e.childNodes.length) {
            focusNode = e.childNodes[focusOffset];
            focusOffset = 0;
        } else {
            focusNode = e.lastChild;
            focusOffset = 
                focusNode.nodeType === Node.TEXT_NODE ? 
                    focusNode.textContent.length : 
                    focusNode.childNodes.length;
        }
    }
    cursorLine = 0;
    cursorPos = 0;
    let walker = document.createTreeWalker(
        e,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        n => {
            if(n.nodeType === Node.TEXT_NODE) {
                if(focusNode === n) {
                    cursorPos += focusOffset;
                    return NodeFilter.FILTER_ACCEPT;
                } else
                    cursorPos += n.textContent.length;
            } else if(isLineBreakingNode(n)) {
                ++cursorLine;
                cursorPos = 0;
                if(focusNode === n) {
                    for(let i = 0; i < focusOffset; ++i)
                        cursorPos += n.childNodes[i].textContent.length;
                    return NodeFilter.FILTER_ACCEPT;
                }
            } else if(focusNode === n) {
                for(let i = 0; i < focusOffset; ++i)
                    cursorPos += n.childNodes[i].textContent.length;
                return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
        }
    );
    walker.nextNode();
    return { cursorLine, cursorPos };
}

export function setCursorLineAndPos(e, { cursorLine, cursorPos }) {
    let nodeLine = 0, nodePos = 0, focusNode = null, focusOffset = null;
    let walker = document.createTreeWalker(
        e,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        n => {
            if(cursorLine > nodeLine) {
                if(isLineBreakingNode(n))
                    ++nodeLine;
            } else {
                if(n.nodeType === Node.TEXT_NODE) {
                    focusNode = n;
                    let nextPos = nodePos + n.textContent.length;
                    if(nextPos >= cursorPos) {
                        focusOffset = cursorPos - nodePos;
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    nodePos = nextPos;
                    focusOffset = n.textContent.length;
                } else if(isLineBreakingNode(n)) {
                    if(focusNode === null || focusOffset === null) {
                        focusNode = n.parentElement;
                        focusOffset = [].indexOf.call(n.parentElement.childNodes, n);
                    }
                    return NodeFilter.FILTER_ACCEPT;
                } else if(n.nodeName === 'BR' && nodePos >= cursorPos) {
                    focusNode = n.parentElement;
                    focusOffset = [].indexOf.call(n.parentElement.childNodes, n);
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
            return NodeFilter.FILTER_SKIP;
        }
    );
    if(walker.nextNode() === null) {
        focusNode = e;
        focusOffset = e.childNodes.length;
    }
    let selection = document.getSelection();
    let range = document.createRange();
    range.setStart(focusNode, focusOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

export function copyToClipboard(str) {
    const el = document.createElement('TEXTAREA');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    el = null;
}

export function farsiNumber(n) {
    let result = (Math.round(n * 10000) / 10000).toString();
    return result.replace(/\d/g, d => String.fromCharCode(0x6f0 + d.charCodeAt(0) - 48));
}

export const urlQueries2Json = () => {
    const url = location.href;
    const question = url.indexOf("?");
    let hash = url.indexOf("#");
    if(hash==-1 && question==-1) return {};
    if(hash==-1) hash = url.length;
    const query = question==-1 || hash==question+1 ? url.substring(hash) : 
    url.substring(question+1,hash);
    var result = {};
    query.split("&").forEach(function(part) {
      if(!part) return;
      part = part.split("+").join(" "); // replace every + with space, regexp-free version
      var eq = part.indexOf("=");
      var key = eq>-1 ? part.substr(0,eq) : part;
      var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
      var from = key.indexOf("[");
      if(from==-1) result[decodeURIComponent(key)] = val;
      else {
        var to = key.indexOf("]",from);
        var index = decodeURIComponent(key.substring(from+1,to));
        key = decodeURIComponent(key.substring(0,from));
        if(!result[key]) result[key] = [];
        if(!index) result[key].push(val);
        else result[key][index] = val;
      }
    });
    return result;
}

export const notify =(function() {
    let dialog = document.querySelector('.notification');
    let hideDialogTimeout = null;
    function notify(title, message, type) {
        dialog.classList = "notification";
        dialog.classList.add(type);
        dialog.querySelector('p').textContent = message;
        dialog.querySelector('h2').textContent = title;
        dialog.classList.add('shown');
        clearTimeout(hideDialogTimeout);
        hideDialogTimeout = setTimeout(
            () => dialog.classList.remove('shown'),
            2000
        );
    }

    return notify;
})();