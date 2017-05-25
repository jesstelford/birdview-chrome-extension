////////////////////////////////////////////////////////////////////////
//
// Birdview.js
// 1.0
//
// www.achrafkassioui.com/birdview/
//
// Copyright (C) 2017 Achraf Kassioui
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any
// later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// https://www.gnu.org/licenses/gpl-3.0.en.html
//
////////////////////////////////////////////////////////////////////////

(function(root, factory){
	if(typeof define === 'function' && define.amd){
		define(function(){
			root.birdview = factory();
			return root.birdview;
		});
	}else if(typeof exports === 'object'){
		module.exports = factory();
	}else{
		root.birdview = factory();
	}
}(this, function() {
	'use strict';

  document.addEventListener('birdview:init', function() {
    birdview.init();
  });

  document.addEventListener('birdview:toggle', function() {
    birdview.toggle();
  });

	////////////////////////////////////////////////////////////////////////
	//
	// Variables
	//
	////////////////////////////////////////////////////////////////////////

	var birdview = {};
	var settings;

	var scaled = false;

	var html = document.documentElement;
	var body = document.body;
	var parent;
	var child;

	var birdview_button;
	var overlay;
	var debug;

	var document_height;
	var viewport_height;
	var scale_value;

	var css_transform_origin_Y = 0;

	var zoom_level;
	var reference_zoom_level;

	var touch = {
		startX: 0,
		startY: 0,
		startSpan: 0,
		count: 0
	}

	/*
	*
	* Keycodes that disable birdview. Most are scrolling related keys
	* left: 37, up: 38, right: 39, down: 40, spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36, esc: 27
	*
	*/
	var scrolling_keys = {37: 1, 38: 1, 39: 1, 40: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1, 27: 1};

	/*
	*
	* For feature test
	*
	*/
	var supports = !!body.addEventListener && !!body.style.transition && !!body.style.transform;

	////////////////////////////////////////////////////////////////////////
	//
	// Default settings
	//
	////////////////////////////////////////////////////////////////////////

	var defaults = {
		shortcut: 90,
		transition_speed: 0.3,
		transition_easing: 'ease',
		css_transform_origin_X: 50,
		create_button: false,
		create_overlay: true,
		callback_start: null,
		callback_end: null,
		debug: false
	}

	////////////////////////////////////////////////////////////////////////
	//
	// DOM setup
	//
	////////////////////////////////////////////////////////////////////////

	/*
	*
	* Will wrap all body content inside
	*
	*	<div id="birdview_parent">
	*		<div id="birdview_child">
	*			...
	*		</div>
	*	</div>
	*
	*/
	function setupDOM(){
		wrapAll(body, 'birdview_parent');
		wrapAll('birdview_parent', 'birdview_child');
		parent = document.getElementById('birdview_parent');
		child = document.getElementById('birdview_child');
		if(settings.create_button) createButton();
		if(settings.create_overlay) createOverlay();
		if(settings.debug) createDebug();
	}

	function restoreDOM(){
		unwrap('birdview_child');
		unwrap('birdview_parent');
		child = null;
		parent = null;
		removeButton();
		removeOverlay();
		removeDebug();
	}

	function createButton(){
		birdview_button = document.createElement('button');
		birdview_button.innerHTML = 'Z';
		birdview_button.id = 'auto_generated_birdview_button';
		birdview_button.classList.add('birdview_toggle');
		body.appendChild(birdview_button);
	}

	function removeButton(){
		var button = document.getElementById('auto_generated_birdview_button');
		if(button) button.parentNode.removeChild(button);
	}

	function createOverlay(){
		overlay = document.createElement('div');
		overlay.id = 'auto_generated_birdview_overlay';
		if(settings.transition_speed === 0) overlay.style.transitionDuration = '0s';
		else overlay.style.transitionDuration = '0.1s';
		body.appendChild(overlay);
	}

	function removeOverlay(){
		var overlay = document.getElementById('auto_generated_birdview_overlay');
		if(overlay) overlay.parentNode.removeChild(overlay);
	}

	/*
	*
	* Creates a div to show debug messages on touch devices. Used with function log(msg)
	*
	*/
	function createDebug(){
		debug = document.createElement('div');
		debug.id = 'birdview_debug';
		debug.innerHTML = 'DEBUG';
		body.appendChild(debug);
	}

	function removeDebug(){
		var debug = document.getElementById('birdview_debug');
		if(debug) debug.parentNode.removeChild(debug);
	}

	////////////////////////////////////////////////////////////////////////
	//
	// Measurements
	//
	////////////////////////////////////////////////////////////////////////

	function updateMeasurements(){
		document_height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
		viewport_height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		scale_value = viewport_height / document_height;
	}

	/*
	*
	* Returns the Y transform origin according to scrolling position, viewport hight and document length 
	*
	*/
	function birdviewTransformOriginY(){
		return css_transform_origin_Y = ((window.pageYOffset + (viewport_height * 0.5)) / document_height) * 100;
	}

	/*
	*
	* Given a value 'x' in [a, b], output a value 'y' in [c, d]
	*
	*/
	function linearTransform(x, a, b, c, d){
		var y = ((x - a) * (d - c)) / (b - a) + c;
		return y;
	}

	function compensateScale(){
		var compensate_scale = (linearTransform(css_transform_origin_Y, 0, 100, -1, 1)) * viewport_height * 0.5;
		return compensate_scale;
	}

	function diveTransformOrigin(click_Y_position){
		return css_transform_origin_Y = ((click_Y_position / viewport_height) * 100);
	}

	function diveScrollPosition(click_Y_position){
		var scroll_to = ((click_Y_position / viewport_height) * document_height) - ((click_Y_position / viewport_height) * viewport_height);
		return scroll_to;
	}

	function currentZoomLevel(){
		var current_zoom_level = screen.width / window.innerWidth;
		return current_zoom_level;
	}

	function distanceBetween(a,b){
		var dx = a.x - b.x;
		var dy = a.y - b.y;
		return Math.sqrt( dx*dx + dy*dy );
	}

	////////////////////////////////////////////////////////////////////////
	//
	// CSS transformations
	//
	////////////////////////////////////////////////////////////////////////

	function birdviewCSS(){
		updateMeasurements();
		parent.style.transition = 'transform ' + settings.transition_speed + 's ' + settings.transition_easing;
		child.style.transition = 'transform ' + settings.transition_speed + 's ' + settings.transition_easing;
		child.style.transformOrigin = settings.css_transform_origin_X + '% ' + birdviewTransformOriginY() + '%';
		child.style.transform = 'scale(' + scale_value + ')';
		parent.style.transform = 'translateY(' + compensateScale() + 'px)';
	}

	function diveCSS(click_Y_position){
		child.style.transformOrigin = settings.css_transform_origin_X + '% ' + diveTransformOrigin(click_Y_position) + '%';
		child.style.transform = 'scale(1)';
		parent.style.transitionDuration = '0s';
		parent.style.transform = 'translateY(0px)';
	}

	function removeBirdviewCSS(){
		child.style.transformOrigin = settings.css_transform_origin_X + '% ' + css_transform_origin_Y + '%';
		child.style.transform = 'scale(1)';
		parent.style.transform = 'translateY(0px)';
	}

	////////////////////////////////////////////////////////////////////////
	//
	// Birdview methods
	//
	////////////////////////////////////////////////////////////////////////

	birdview.toggle = function(){
		if(!scaled) enterBirdview();
		else exitBirdview();
	}

	function enterBirdview(){
		if(scaled) return;
		if(viewport_height >= document_height){
			console.log('Page already fits in viewport');
			return;
		}
		scaled = true;
		if(settings.create_overlay) toggleOverlay();
		birdviewCSS();
		if(settings.callback_start) settings.callback_start();
	}

	function exitBirdview(){
		if(!scaled) return;
		scaled = false;
		if(settings.create_overlay) toggleOverlay();
		removeBirdviewCSS();
		if(settings.callback_end) settings.callback_end();
	}

	function dive(click_Y_position){
		if(!scaled) return;
		scaled = false;
		if(settings.create_overlay) toggleOverlay();
		diveCSS(click_Y_position);
		window.scrollTo(0, diveScrollPosition(click_Y_position));
		if(settings.callback_end) settings.callback_end();
	}

	////////////////////////////////////////////////////////////////////////
	//
	// User interface
	//
	////////////////////////////////////////////////////////////////////////

	function toggleOverlay(){
		if(settings.transition_speed === 0){
			if(scaled) showMenu();
			else hideOverlay();
		}
		/*
		*
		* Handle overlay display with transitionend event
		*
		*/
		else showLoading();
	}

	function showLoading(){
		overlay.classList.add('show');
		overlay.classList.add('zooming');
		overlay.innerHTML = '<h1>Zooming...</h1>';
		if(settings.create_button) birdview_button.classList.remove('hidden');
	}

	function showMenu(){
		if(overlay.classList.contains('zooming')) overlay.classList.remove('zooming');
		if(!overlay.classList.contains('show')) overlay.classList.add('show');
		overlay.innerHTML = '<h1>Birdview</h1><button class="birdview_toggle">X</button>' + addNavigation() + '<span>Click to dive<br>Press Z or pinch to toggle birdview</span>';
		if(settings.create_button) birdview_button.classList.add('hidden');
	}

	function hideOverlay(){
		overlay.innerHTML = '';
		if(overlay.classList.contains('show')) overlay.classList.remove('show');
		if(settings.create_button) birdview_button.classList.remove('hidden');
	}

	function addNavigation(){
		var breadcrumb;
		if(location.pathname == "/") breadcrumb = '<a href="/">Home</a>';
		else breadcrumb = '<a href="/">Home</a>/<a href="">' + document.title + '</a>';
		return breadcrumb;
	}

	////////////////////////////////////////////////////////////////////////
	//
	// Events handlers
	//
	////////////////////////////////////////////////////////////////////////

	function eventHandler(e){

		if(e.type === 'transitionend'){
			if(scaled) showMenu();
			else hideOverlay();
		}

		if(e.type === 'resize' && scaled) birdviewCSS();

		if(e.type === 'orientationchange') reference_zoom_level = currentZoomLevel();

		if(e.type === 'keydown'){
			var tag = e.target.tagName;
			if(e.keyCode == settings.shortcut && tag != 'INPUT' && tag != 'TEXTAREA' && tag != 'SELECT'){
				birdview.toggle();
			}else if(scrolling_keys[e.keyCode]){
				exitBirdview();
			}
		}

		if(e.type === 'click'){
			var target = e.target;
			if(target.classList.contains('birdview_toggle') || target.parentNode.classList.contains('birdview_toggle')){
				birdview.toggle();
			}else if(scaled){
				var tag = target.tagName;
				if(tag === 'A' || target.parentNode.tagName === 'A'){
					return;
				}else if(tag != 'H1' && tag != 'A' && tag != 'BUTTON'){
					dive(e.clientY);
				}else if(tag === 'H1'){
					birdview.toggle();
				}
			}
		}

		if(e.type === 'scroll' || e.type === 'mousewheel' || e.type === 'onwheel' || e.type === 'DOMMouseScroll' || e.type === 'onmousewheel'){
			exitBirdview();
		}

		if(e.type === 'mousedown' && e.which === 2){
			exitBirdview();
		}
	};

	function onTouchStart(e){        
		/*
		*
		* The touch handling logic is inspired from reveal.js https://github.com/hakimel/reveal.js/blob/master/js/reveal.js
		*
		*/
		touch.startX = e.touches[0].clientX;
		touch.startY = e.touches[0].clientY;
		touch.count = e.touches.length;

		/*
		*
		* If there are two touches we need to memorize the distance between those two points to detect pinching
		*
		*/
		if(e.touches.length === 2){
			touch.startSpan = distanceBetween({
				x: e.touches[1].clientX,
				y: e.touches[1].clientY
			},{
				x: touch.startX,
				y: touch.startY
			});
		}
	}

	function onTouchMove(e){
		/*
		*
		* If in birdview, then disable touch scroll
		*
		*/
		if(scaled) e.preventDefault();

		/*
		*
		* We want to trigger birdview with a pinch in, but we don't want to disable the pinch out zoom
		* Test the zoom level of the document relative to a reference value stored on first load. Proceed only if the page is not zoomed in
		*
		*/
		zoom_level = currentZoomLevel();
		if(zoom_level != reference_zoom_level) return;

		/*
		*
		* If the touch started with two points and still has two active touches, test for the pinch gesture
		*
		*/
		if(e.touches.length === 2 && touch.count === 2){
			/*
			*
			* The current distance in pixels between the two touch points
			*
			*/
			var currentSpan = distanceBetween({
				x: e.touches[1].clientX,
				y: e.touches[1].clientY
			},{
				x: touch.startX,
				y: touch.startY
			});

			/*
			*
			* If user starts pinching in, disable default browser behavior
			*
			*/
			if(currentSpan <= touch.startSpan){
				e.preventDefault();
			}

			/*
			*
			* If the span is larger than the desired amount, toggle birdview
			*
			*/
			if(Math.abs( touch.startSpan - currentSpan ) > 30 ){
				if(currentSpan < touch.startSpan){
					enterBirdview();
				}else{
					/*
					*
					* In birdview and if the user pinches out, dive into the Y mid point between the two touches
					*
					*/
					dive( (touch.startY + e.touches[1].clientY) * 0.5 );
				}
			}
		}
	}

	////////////////////////////////////////////////////////////////////////
	//
	// Utility functions
	//
	////////////////////////////////////////////////////////////////////////

	function extend(defaults, options) {
		var extended = {};
		var prop;
		for(prop in defaults){
			if (Object.prototype.hasOwnProperty.call(defaults, prop)){
				extended[prop] = defaults[prop];
			}
		}
		for(prop in options){
			if(Object.prototype.hasOwnProperty.call(options, prop)){
				extended[prop] = options[prop];
			}
		}
		return extended;
	}

	function wrapAll(parent, wrapper_id){
		if(parent != body) var parent = document.getElementById(parent);
		var wrapper = document.createElement('div');
		wrapper.id = wrapper_id;
		while (parent.firstChild) wrapper.appendChild(parent.firstChild);
		parent.appendChild(wrapper);
	}

	function unwrap(wrapper){
		var wrapper = document.getElementById(wrapper);
		var parent = wrapper.parentNode;
		while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
		parent.removeChild(wrapper);
	}

	function log(message){
		if(debug) debug.innerHTML = message;
	}

	////////////////////////////////////////////////////////////////////////
	//
	// Initialize
	//
	////////////////////////////////////////////////////////////////////////

	birdview.init = function(options){

		if(!!supports) return;

		birdview.destroy();

		settings = extend(defaults, options || {} );

		setupDOM();

		updateMeasurements();

		reference_zoom_level = currentZoomLevel();

		if(settings.transition_speed != 0) child.addEventListener("transitionend", eventHandler, false);

		/*
		*
		* Active event listeners. See: https://developers.google.com/web/updates/2017/01/scrolling-intervention
		*
		*/
		if('ontouchstart' in window){
			document.addEventListener('touchstart', onTouchStart, {passive: false});
			document.addEventListener('touchmove', onTouchMove, {passive: false});
		}else{
		}

		document.addEventListener('keydown', eventHandler, false);

		document.addEventListener('click', eventHandler, false);

		window.addEventListener('scroll', eventHandler, false);

		window.addEventListener('resize', eventHandler, false);

		window.addEventListener("orientationchange", eventHandler, false);

		console.log('Birdview is running. Press Z');
	};

	////////////////////////////////////////////////////////////////////////
	//
	// Destroy
	//
	////////////////////////////////////////////////////////////////////////

	birdview.destroy = function(){

		if(!settings) return;

		if(settings.transition_speed != 0) child.removeEventListener("transitionend", eventHandler, false);

		restoreDOM();

		reference_zoom_level = null;

		if('ontouchstart' in window){
			document.removeEventListener('touchstart', onTouchStart, {passive: false});
			document.removeEventListener('touchmove', onTouchMove, {passive: false});
		}else{	
		}

		document.removeEventListener('keydown', eventHandler, false);

		document.removeEventListener('click', eventHandler, false);

		window.removeEventListener('scroll', eventHandler, false);

		window.removeEventListener('resize', eventHandler, false);

		window.removeEventListener("orientationchange", eventHandler, false);

		scaled = false;
		settings = null;

		console.log('Birdview was destroyed');
	}

	return birdview;
}));
