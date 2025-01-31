var live = require('can-view-live');
var compute = require('can-compute');
var Map = require('can-map');
var List = require('can-list');
var nodeLists = require('can-view-nodelist');
var canBatch = require('can-event/batch/batch');
var Observation = require("can-observation");

var QUnit = require('steal-qunit');

var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');

var domAttr = require("can-util/dom/attr/attr");
var fragment = require('can-util/dom/fragment/fragment');
var makeArray = require('can-util/js/make-array/make-array');

QUnit.module('can-view-live',{
	setup: function(){
		this.fixture = document.getElementById('qunit-fixture');
	}
});

test('html', function () {
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);
	var items = new List([
		'one',
		'two'
	]);
	var html = compute(function () {
		var html = '';
		items.each(function (item) {
			html += '<label>' + item + '</label>';
		});
		return html;
	});
	live.html(span, html, div);
	equal(div.getElementsByTagName('label').length, 2);
	items.push('three');
	equal(div.getElementsByTagName('label').length, 3);
});
var esc = function (str) {
	return str.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
};

test('text', function () {
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);
	var items = new List([
		'one',
		'two'
	]);
	var text = compute(function () {
		var html = '';
		items.each(function (item) {
			html += '<label>' + item + '</label>';
		});
		return html;
	});
	live.text(span, text, div);
	equal(div.innerHTML, esc('<label>one</label><label>two</label>'));
	items.push('three');
	equal(div.innerHTML, esc('<label>one</label><label>two</label><label>three</label>'));
});

test('attributes', function () {
	var div = document.createElement('div');
	var items = new List([
		'class',
		'foo'
	]);
	var text = compute(function () {
		var html = '';
		if (items.attr(0) && items.attr(1)) {
			html += items.attr(0) + '=\'' + items.attr(1) + '\'';
		}
		return html;
	});
	live.attrs(div, text);
	equal(div.className, 'foo');
	items.splice(0, 2);
	equal(div.className, '');
	items.push('foo', 'bar');
	equal(div.getAttribute('foo'), 'bar');
});

test('attributes - should stop listening for removal once removed', function (assert) {
	var done = assert.async();
	var onNodeRemoval = domMutate.onNodeRemoval;

	domMutate.onNodeRemoval = function () {
		assert.ok(true, 'addEventListener called');
		var disposal = onNodeRemoval.apply(null, arguments);
		domMutate.onNodeRemoval = onNodeRemoval;
		return function () {
			assert.ok(true, 'disposal function was called');
			disposal();
			done();
		};
	};

	var div = document.createElement('div');
	var text = compute('hello');

	domMutateNode.appendChild.call(this.fixture, div);
	live.attrs(div, text);
	domMutateNode.removeChild.call(this.fixture, div);
});

test('attribute', function () {
	var div = document.createElement('div');

	var firstObject = new Map({});
	var first = compute(function () {
		return firstObject.attr('selected') ? 'selected' : '';
	});
	var secondObject = new Map({});
	var second = compute(function () {
		return secondObject.attr('active') ? 'active' : '';
	});
	var className = compute(function(){
		return "foo "+first() + " "+ second()+" end";
	});

	live.attr(div, 'class', className);

	equal(div.className, 'foo   end');
	firstObject.attr('selected', true);
	equal(div.className, 'foo selected  end');
	secondObject.attr('active', true);
	equal(div.className, 'foo selected active end');
	firstObject.attr('selected', false);
	equal(div.className, 'foo  active end');
});

test('specialAttribute with new line', function () {
	var div = document.createElement('div');
	var style = compute('width: 50px;\nheight:50px;');
	live.attr(div, 'style', style);
	equal(div.style.height, '50px');
	equal(div.style.width, '50px');
});

test('list', function () {
	var div = document.createElement('div'),
		list = new List([
			'sloth',
			'bear'
		]),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, list, template, {});
	equal(div.getElementsByTagName('label')
		.length, 2, 'There are 2 labels');
	div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';
	list.push('turtle');
	equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');
});

test('list within a compute', function () {
	var div = document.createElement('div'),
		map = new Map({
			animals: [
				'bear',
				'turtle'
			]
		}),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	var listCompute = compute(function () {
		return map.attr('animals');
	});
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listCompute, template, {});
	equal(div.getElementsByTagName('label')
		.length, 2, 'There are 2 labels');
	div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';

	map.attr('animals')
		.push('turtle');

	equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');

	map.attr('animals', new List([
		'sloth',
		'bear',
		'turtle'
	]));
	var spans = div.getElementsByTagName('span');
	equal(spans.length, 3, 'there are 3 spans');
	ok(!div.getElementsByTagName('label')[0].myexpando, 'no expando');
});

test('list with a compute that returns a list', function () {
	var div = document.createElement('div');
	var template = function (num) {
		return '<label>num=</label> <span>' + num + '</span>';
	};
	var arrCompute = compute([ 0, 1 ]);
	div.innerHTML = 'my <b>fav</b> nums: <span></span> !';
	var el = div.getElementsByTagName('span')[0];

	live.list(el, arrCompute, template, {});

	equal(div.getElementsByTagName('label').length, 2, 'There are 2 labels');
	arrCompute([ 0, 1, 2 ]);
	var spans = div.getElementsByTagName('span');
	equal(spans.length, 3, 'there are 3 spans');
});

test('text binding is memory safe (#666)', function () {
	nodeLists.nodeMap.clear();

	var div = document.createElement('div'),
		span = document.createElement('span'),
		text = compute(function () {
			return 'foo';
		});
	div.appendChild(span);

	domMutateNode.appendChild.call(this.fixture, div);

	live.text(span, text, div);
	domMutateNode.removeChild.call(this.fixture, div);
	stop();
	setTimeout(function () {
		ok(!nodeLists.nodeMap.size, 'nothing in nodeMap');
		start();
	}, 100);
});

test('html live binding handles getting a function from a compute',5, function(){
	var handler = function(el){
		ok(true, "called handler");
		equal(el.nodeType, 3, "got a placeholder");
	};

	var div = document.createElement('div'),
		placeholder = document.createTextNode('');
	div.appendChild(placeholder);

	var count = compute(0);
	var html = compute(function(){
		if(count() === 0) {
			return "<h1>Hello World</h1>";
		} else {
			return handler;
		}
	});


	live.html(placeholder, html, div);

	equal(div.getElementsByTagName("h1").length, 1, "got h1");
	count(1);
	equal(div.getElementsByTagName("h1").length, 0, "got h1");
	count(0);
	equal(div.getElementsByTagName("h1").length, 1, "got h1");
});

test("live.list does not unbind on a list unnecessarily (#1835)", function(){
	expect(0);
	var div = document.createElement('div'),
		list = new List([
			'sloth',
			'bear'
		]),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal + '</span>';
		},
		unbind = list.unbind;

	list.unbind = function(){
		ok(false, "unbind called");
		return unbind.apply(this, arguments);
	};

	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];

	live.list(el, list, template, {});
});

test('live.list should handle move events', function (assert) {
	/*
		All this test does is make sure triggering the move event
		does not cause live.list to blow up.
	*/
	var parent = document.createElement('div');
	var child = document.createElement('div');
	parent.appendChild(child);
	var list = new List([1, 2, 3]);
	var template = function (num) {
		return '<span>' + num + '</span>';
	};

	live.list(child, list, template, {});

	var oldIndex = 0;
	var newIndex = 2;
	var val = list[oldIndex];
	var args = [val, oldIndex, newIndex];
	list.dispatch('move', args);

	assert.ok(true, 'The list should not blow up');
});

test("can.live.attr works with non-string attributes (#1790)", function() {
	var el = document.createElement('div'),
		attrCompute = compute(function() {
			return 2;
		});

	domAttr.set(el, "value", 1);
	live.attr(el, 'value', attrCompute);
	ok(true, 'No exception thrown.');
});

test('list and an falsey section (#1979)', function () {
	var div = document.createElement('div'),
		template = function (num) {
			return '<label>num=</label> <span>' + num + '</span>';
		},
		falseyTemplate = function () {
			return '<p>NOTHING</p>';
		};

	var listCompute = compute([ 0, 1 ]);
	div.innerHTML = 'my <b>fav</b> nums: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listCompute, template, {}, undefined, undefined, falseyTemplate );

	equal(div.getElementsByTagName('label').length, 2, 'There are 2 labels');

	listCompute([]);

	var spans = div.getElementsByTagName('span');
	equal(spans.length, 0, 'there are 0 spans');

	var ps = div.getElementsByTagName('p');
	equal(ps.length, 1, 'there is 1 p');

	listCompute([2]);

	spans = div.getElementsByTagName('span');
	equal(spans.length, 1, 'there is 1 spans');

	ps = div.getElementsByTagName('p');
	equal(ps.length, 0, 'there is 1 p');
});

test('list and an initial falsey section (#1979)', function(){

	var div = document.createElement('div'),
		template = function (num) {
			return '<label>num=</label> <span>' + num + '</span>';
		},
		falseyTemplate = function () {
			return '<p>NOTHING</p>';
		};

	var listCompute = compute([]);

	div.innerHTML = 'my <b>fav</b> nums: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listCompute, template, {}, undefined, undefined, falseyTemplate );

	var spans = div.getElementsByTagName('span');
	equal(spans.length, 0, 'there are 0 spans');

	var ps = div.getElementsByTagName('p');
	equal(ps.length, 1, 'there is 1 p');

	listCompute([2]);

	spans = div.getElementsByTagName('span');
	equal(spans.length, 1, 'there is 1 spans');

	ps = div.getElementsByTagName('p');
	equal(ps.length, 0, 'there is 1 p');
});

test('rendered list items should re-render when updated (#2007)', function () {
	var partial = document.createElement('div');
	var placeholderElement = document.createElement('span');
	var list = new List([ 'foo' ]);
	var renderer = function(item) {
		return '<span>' + item.get() + '</span>';
	};

	partial.appendChild(placeholderElement);

	live.list(placeholderElement, list, renderer, {});

	equal(partial.getElementsByTagName('span')[0].firstChild.data, 'foo', 'list item 0 is foo');

	list.push('bar');

	equal(partial.getElementsByTagName('span')[1].firstChild.data, 'bar', 'list item 1 is bar');

	list.attr(0, 'baz');

	equal(partial.getElementsByTagName('span')[0].firstChild.data, 'baz', 'list item 0 is baz');
});

test('list items should be correct even if renderer flushes batch (#8)', function () {
	var partial = document.createElement('div');
	var placeholderElement = document.createElement('span');
	var list = new List([ 'one', 'two' ]);
	var renderer = function(item) {
		// batches can be flushed in renderers (such as those using helpers like `#each`)
		canBatch.flush();
		return '<span>' + item.get() + '</span>';
	};

	partial.appendChild(placeholderElement);

	live.list(placeholderElement, list, renderer, {});

	equal(partial.getElementsByTagName('span').length, 2, 'should be two items');
	equal(partial.getElementsByTagName('span')[0].firstChild.data, 'one', 'list item 0 is "one"');
	equal(partial.getElementsByTagName('span')[1].firstChild.data, 'two', 'list item 1 is "two"');

	canBatch.start();
	list.splice(0, 0, 'three');
	list.splice(2, 1);
	canBatch.stop();

	equal(partial.getElementsByTagName('span').length, 2, 'should be two items');
	equal(partial.getElementsByTagName('span')[0].firstChild.data, 'three', 'list item 0 is "three"');
	equal(partial.getElementsByTagName('span')[1].firstChild.data, 'one', 'list item 1 is "one"');
});

test('changing items in a live.list after it has been unregistered works (#55)', function() {
	// this test replicates the behavior of this stache template:
	//
	// {{#if show}}
	//		{{#each list}}
	//			{{.}}
	//		{{/each}}
	//	{{/if}}
	//
	//	and this code:
	//
	//	canBatch.start();
	//	show = false;
	//	list.replace(...);
	//	canBatch.stop();
	var map = new Map({
		show: true,
		list: [ 'one' ]
	});

	// set up nodelists
	var htmlNodeList = makeArray(fragment("<div></div>").childNodes);
	nodeLists.register(htmlNodeList, function(){}, true);

	var listNodeList = makeArray(fragment("<div></div>").childNodes);
	nodeLists.register(listNodeList, function(){}, htmlNodeList, true);

	// set up elements
	var listTextNode = document.createTextNode('');
	var listFrag = document.createDocumentFragment();
	listFrag.appendChild(listTextNode);

	var htmlTextNode = document.createTextNode('');
	var div = document.createElement('div');
	div.appendChild(htmlTextNode);

	// create live.list for `{{#each list}}`
	var listObs = new Observation(function() {
		return map.attr('list');
	});
	var listRenderer = function(item) {
		// must use an Observation as the live.list "compute"
		// Observation.prototype.get() will trigger a canBatch.flush() (if observation is bound)
		// which will cause the listNodeList to be unregistered
		Observation.temporarilyBind(item);
		return item.get();
	};
	live.list(listTextNode, listObs, listRenderer, map, listTextNode.parentNode, listNodeList);

	// create live.html for `{{#if show}}`
	var htmlObservation = new Observation(function() {
		return map.attr('show') ? listFrag : undefined;
	});
	live.html(htmlTextNode, htmlObservation, htmlTextNode.parentNode, htmlNodeList);

	canBatch.start();
	map.attr('show', false);
	map.attr('list').replace([ 'two', 'three' ]);
	canBatch.stop();

	ok(true, 'should not throw');
});

QUnit.test("Works with Observations - .html", function(){
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);
	var items = new List([
		'one',
		'two'
	]);
	var html = new Observation(function () {
		var html = '';
		items.each(function (item) {
			html += '<label>' + item + '</label>';
		});
		return html;
	});
	live.html(span, html, div);
	equal(div.getElementsByTagName('label').length, 2);
	items.push('three');
	equal(div.getElementsByTagName('label').length, 3);
});


QUnit.test('Works with Observations - .list', function () {
	var div = document.createElement('div'),
		map = new Map({
			animals: [
				'bear',
				'turtle'
			]
		}),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	var listObservation = new Observation(function () {
		return map.attr('animals');
	});
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listObservation, template, {});
	equal(div.getElementsByTagName('label')
		.length, 2, 'There are 2 labels');
	div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';

	map.attr('animals')
		.push('turtle');

	equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');

	map.attr('animals', new List([
		'sloth',
		'bear',
		'turtle'
	]));
	var spans = div.getElementsByTagName('span');
	equal(spans.length, 3, 'there are 3 spans');
	ok(!div.getElementsByTagName('label')[0].myexpando, 'no expando');
});

QUnit.test('Works with Observations - .attrs', function () {
	var div = document.createElement('div');
	var items = new List([
		'class',
		'foo'
	]);
	var text = new Observation(function () {
		var html = '';
		if (items.attr(0) && items.attr(1)) {
			html += items.attr(0) + '=\'' + items.attr(1) + '\'';
		}
		return html;
	});
	live.attrs(div, text);
	equal(div.className, 'foo');
	items.splice(0, 2);
	equal(div.className, '');
	items.push('foo', 'bar');
	equal(div.getAttribute('foo'), 'bar');
});

QUnit.test('Works with Observations - .attr', function(){
	var div = document.createElement('div');

	var firstObject = new Map({});

	var first = compute(function () {
		return firstObject.attr('selected') ? 'selected' : '';
	});

	var secondObject = new Map({});
	var second = compute(function () {
		return secondObject.attr('active') ? 'active' : '';
	});
	var className = new Observation(function(){
		return "foo "+first() + " "+ second()+" end";
	});

	live.attr(div, 'class', className);

	equal(div.className, 'foo   end');
	firstObject.attr('selected', true);
	equal(div.className, 'foo selected  end');
	secondObject.attr('active', true);
	equal(div.className, 'foo selected active end');
	firstObject.attr('selected', false);
	equal(div.className, 'foo  active end');
});

QUnit.test("events are torn down from correct list on change", function() {
	var div = document.createElement('div');
	var list = new List([1, 2, 3]);
	var filteredList;
	var c = compute(list);
	var template = function (number) {
		return '<label>Odd number=</label> <span>' + number.get() + '</span>';
	};
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, c, template, {});

	ok(list.__bindEvents.add && list.__bindEvents.add.length > 0, "Add handler has been added to list");

	c(filteredList = list.filter(function(x) {
		return x % 2;
	}));

	ok(!list.__bindEvents.add || list.__bindEvents.add.length === 0, "Add handler has been removed from list");
	ok(filteredList.__bindEvents.add && filteredList.__bindEvents.add.length > 0, "Add handler has been added to filteredList");
});

