$(document).foundation();

// TODO: Configure this into a enviro var set by Gulp?
var enviro = window.location.href;

function editForm(emailArr, data) {
	var val = $('select.emailFormDropdown').val(), itemExists = false; 
	if(val !== 'New'){
		for(var i=0; i<emailArr.length; i++){
			if(emailArr[i].identifier === val) {
				emailArr[i] = data;
				itemExists = true;
			}
		}
	}
	if(!itemExists) {
		emailArr.push(data);
	}
	return emailArr;
}

// Run Gulp function
function generateEmail(){
	var data, oneInstance, timeStamp, localData, emailObject, emailArr = [], version;
	
	timeStamp = Math.floor(Date.now() / 1000);
	version = $('select.emailFormDropdown').val();
	data = $('form').serialize();
	
	localData = $('form').serializeArray();
	emailObject = {
			identifier : version,
			form : localData
	}
	emailArr = localStorage.emailForms ? JSON.parse(localStorage.emailForms) : [];
	emailArr = editForm(emailArr, emailObject);
	
	/* save the form to localStorage */
	localStorage.setItem("emailForms", JSON.stringify(emailArr));
	localStorage.setItem("selectedForm", version);
	$.post(enviro + "api", data).done(function( data ) {
		//console.log( "Data Loaded: " + data );
	});
}

function htmlEscape(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

// Code Output
function generateOutput() {
	
	var iframe, iframeSrc;
	iframe = $('iframe').first().contents().find('html');
	iframe.find('script').remove();
	$('#__bs_notify__').remove();
	iframeSrc = iframe.prop('outerHTML');
	iframeSrc = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' + iframeSrc;
	iframeSrc = htmlEscape(iframeSrc);

	$('code').empty().append(iframeSrc);
	//Configure HighlightJS
	hljs.configure({
		tabReplace: '', // 1 spaces
	})
	$('pre code').each(function(i, block) {
		hljs.highlightBlock(block);
	});
}	

function getOtherForms() {
	var emailForms, timeStamp, site;
	timeStamp = Math.floor(Date.now() / 1000);
	site = $('input[type=radio][name=site]:checked').val();

	$('.emailFormDropdown').append('<option value="' + site + timeStamp + '">New</option>');	
	if(localStorage.emailForms){
		emailForms = JSON.parse(localStorage.emailForms);
		for (var i=0; i<emailForms.length; i++) {
			$('.emailFormDropdown').append('<option value= "' + emailForms[i].identifier + '">' +  emailForms[i].identifier + '</option>');	
		}
	}
}

function reloadForm(value) {
	var forms = JSON.parse(localStorage.emailForms);
	var f;

	// get the selected form from local storage. The 'value' parameter is what is selected from the versions dropdown
	for(var i=0; i<forms.length; i++){
		if(forms[i].identifier === value){
			f = forms[i].form
		} 
	}
	// POPULATE the form
	if(f){
		for(var i=0; i<f.length; i++){
			if(f[i].name === 'site' || f[i].name === 'hero-cta-number' ){
				if(f[i].name === "hero-cta-number") {
					buildCtaInputs(f[i].value, 'Reload Form');
				}
				$("input[name=site]").each(function() {
					if($(this).val() === f[i].value) {
						$(this).prop('checked', true);
					}
				});
			} else {
				$("input[name=" +f[i].name + "]").val(f[i].value);
				if(f[i].name === "content-total-skus") {
					buildSkuInputs(f[i].value);
				}
			}
		}
		$('#desktopIframe')[0].src = '/' + value + '.html';
	} else {
		var site = $('input[type=radio][name=site]:checked').val();
		
		// TODO: Clean this mess... (Bug: DO NOT blank out form elements that need default values...)
		$('#email-form input').not('input[name=site], input[name=hero-cta-number], input[name=hero-cta-style], input.button').val("");
		
		$('#desktopIframe')[0].src = '/' + site +'.html';
	}
}

// FORM - Check which site is cheched


// FORM - Build the SKU inputs.
function buildSkuInputs(skuNumber) {
	var skuContainer = $('<div />');
	// Loop through the SKU inputs.
	for(var i = 1; i <= skuNumber; i++) {
		if (i == 1) { skuContainer.append('<label>Products:</label>'); }
		if (i != 1) { skuContainer.append('<hr/>'); }
		skuContainer.append('<input name="content-skus-'+i+'-image" class="content-sku" type="text" placeholder="content-skus-'+i+'-image">');
		skuContainer.append('<input name="content-skus-'+i+'-href" class="content-sku" type="text" placeholder="content-skus-'+i+'-href">');
		skuContainer.append('<input name="content-skus-'+i+'-gender" class="content-sku" type="text" placeholder="content-skus-'+i+'-gender">');
		skuContainer.append('<input name="content-skus-'+i+'-brand" class="content-sku" type="text" placeholder="content-skus-'+i+'-brand">');
		skuContainer.append('<input name="content-skus-'+i+'-title" class="content-sku" type="text" placeholder="content-skus-'+i+'-title">');
		skuContainer.append('<input name="content-skus-'+i+'-price" class="content-sku" type="text" placeholder="content-skus-'+i+'-price">');
		skuContainer.append('<input name="content-skus-'+i+'-compare-at-price" class="content-sku" type="text" placeholder="content-skus-'+i+'-compare-at-price">');
	}
	// Write the markup.
	$('.content-skus').html(skuContainer);
	// Set the selected value.
	$('select[name=content-total-skus]').val(skuNumber);
}

// FORM - Build the CTA inputs
function buildCtaInputs(ctaNumber) {
	var ctaContainer = $('<div />');
	// Loop through the CTA inputs.
	for(var i = 1; i <= ctaNumber; i++) {
		if (i != 1) { ctaContainer.append('<hr/>'); }
		ctaContainer.append('<input class="hero-ctas" type="text" name="hero-cta-'+i+'-copy" placeholder="hero-cta-'+i+'-copy"/>');
		ctaContainer.append('<input class="hero-ctas" type="text" name="hero-cta-'+i+'-url" placeholder="hero-cta-'+i+'-url"/>');
	}
	// Write the markup.
	$('.hero-ctas').html(ctaContainer);

	// Set the selected value.
	$('input[name=hero-cta-number][value='+ ctaNumber +']').prop('checked', true);
}

// Init for Clipboard lib
function initClipboardJS() {
	var clipboard = new Clipboard('.email-output .button');
	clipboard.on('success', function(e) {
		// Feedback
		$(e.trigger).html('Copied');
	});
	clipboard.on('error', function(e) {
	});
}

$(document).ready(function() {
	
	// Output init functions.
	initClipboardJS();
	$('#desktopIframe').load(function(){
		generateOutput();
	});
	
	// Input init functions.
	buildSkuInputs(4);
	buildCtaInputs(2);
	getOtherForms();
	

	

	// Listner - Form Submit
	$('#email-form').submit(function(e) {
		generateEmail();

		// Show loader SVG
		$('.email-input-submit img').show();

		e.preventDefault();
	});

	$('select.emailFormDropdown').on('change', function() {
	  reloadForm( this.value );

	});

	// On change, select 'NEW' from the versions dropdown, reset it's value
	$('input[type=radio][name=site]').on('change', function() {
		var selectedVal = this.value, timeStamp, site;
		timeStamp = Math.floor(Date.now() / 1000);
		site = $('input[type=radio][name=site]:checked').val();
		
		// TODO: Bug - when an email is generated and stored, and user wants to create New - error on line 165.

		$('select.emailFormDropdown').children().first().val(selectedVal + timeStamp);
		$('#desktopIframe')[0].src = '/' + site +'.html';
	});
	

	if(localStorage.selectedForm) {
		$('select.emailFormDropdown').val(localStorage.selectedForm).change();
	}

	// Listner - CTA Number
	$('input[type=radio][name=hero-cta-number]').change(function() {
		// Remove existing inputs
		$('.hero-ctas .hero-cta').remove();
		// Build CTAs
		buildCtaInputs(this.value);
	});

	// Listner - Total SKUs
	$('select[name=content-total-skus]').change(function() {
		// Remove existing inputs
		$('.content-skus .content-sku').remove();
		// Build Skus
		buildSkuInputs(this.value);
	});

	// Listner - Preview Tabs
	$('.tabs .tabs-title a').on('click', function(){
		// Change iFrame width
		if($(this).html() === 'Mobile') {
			$('#desktopIframe').attr('width', 360);
		} else if ($(this).html() === 'Desktop') {
			$('#desktopIframe').attr('width', 650);
		}
	});

});