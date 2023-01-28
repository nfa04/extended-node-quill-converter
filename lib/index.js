const fs = require('fs');
const path = require('path');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

let quillFilePath = require.resolve('quill');
let quillMinFilePath = quillFilePath.replace('quill.js', 'quill.min.js');

let quillLibrary = fs.readFileSync(quillMinFilePath);
let mutationObserverPolyfill = fs.readFileSync(path.join(__dirname, 'polyfill.js'));

console.log(quillMinFilePath);

const JSDOM_TEMPLATE = `
  <div id="editor">hello</div>
  <script>${mutationObserverPolyfill}</script>
  <script>${quillLibrary}</script>
  <script>
  	var BlockEmbed = Quill.import("blots/block/embed");

	class AudioBlot extends BlockEmbed {
    	static create(url) {
      	let node = super.create();
      	node.setAttribute('src', url);
      // Set non-format related attributes with static values
      node.setAttribute('frameborder', '0');
      node.setAttribute('allowfullscreen', false);
  
      return node;
    }
  
    static formats(node) {
      // We still need to report unregistered embed formats
      let format = {};
      if (node.hasAttribute('height')) {
	format.height = node.getAttribute('height');
      }
      if (node.hasAttribute('width')) {
	format.width = node.getAttribute('width');
      }
      return format;
    }
  
    static value(node) {
      return node.getAttribute('src');
    }
  
    format(name, value) {
      // Handle unregistered embed formats
      if (name === 'height' || name === 'width') {
	if (value) {
	  this.domNode.setAttribute(name, value);
	} else {
	  this.domNode.removeAttribute(name, value);
	}
      } else {
	super.format(name, value);
      }
    }
  }

AudioBlot.blotName = 'audio';
AudioBlot.tagName = 'iframe';

Quill.register(AudioBlot);
  </script>
  <script>
    document.getSelection = function() {
      return {
        getRangeAt: function() { }
      };
    };
    document.execCommand = function (command, showUI, value) {
      try {
          return document.execCommand(command, showUI, value);
      } catch(e) {}
      return false;
    };
  </script>
`;

const JSDOM_OPTIONS = { runScripts: 'dangerously', resources: 'usable' };
const DOM = new JSDOM(JSDOM_TEMPLATE, JSDOM_OPTIONS);

const cache = {};

exports.convertTextToDelta = (text) => {
  if (!cache.quill) {
    cache.quill = new DOM.window.Quill('#editor');
  }

  cache.quill.setText(text);

  let delta = cache.quill.getContents();
  return delta;
};

exports.convertHtmlToDelta = (html) => {
  if (!cache.quill) {
    cache.quill = new DOM.window.Quill('#editor');
  }

  let delta = cache.quill.clipboard.convert(html);

  return delta;
};

exports.convertDeltaToHtml = (delta) => {
  if (!cache.quill) {
    cache.quill = new DOM.window.Quill('#editor');
  }

  cache.quill.setContents(delta);

  let html = cache.quill.root.innerHTML;
  return html;
};
