window.onload=function(){var d,c=window.Cropper,i=window.URL||window.webkitURL,r=document.querySelector(".img-container").getElementsByTagName("img").item(0),e=(document.getElementById("download"),document.getElementById("actions")),o=document.getElementById("dataX"),a=document.getElementById("dataY"),n=document.getElementById("dataHeight"),l=document.getElementById("dataWidth"),s=document.getElementById("dataRotate"),u=document.getElementById("dataScaleX"),g=document.getElementById("dataScaleY"),m={aspectRatio:16/9,preview:".img-preview",ready:function(e){console.log(e.type)},cropstart:function(e){console.log(e.type,e.detail.action)},cropmove:function(e){console.log(e.type,e.detail.action)},cropend:function(e){console.log(e.type,e.detail.action)},crop:function(e){var t=e.detail;console.log(e.type),o.value=Math.round(t.x),a.value=Math.round(t.y),n.value=Math.round(t.height),l.value=Math.round(t.width),s.value=void 0!==t.rotate?t.rotate:"",u.value=void 0!==t.scaleX?t.scaleX:"",g.value=void 0!==t.scaleY?t.scaleY:""},zoom:function(e){console.log(e.type,e.detail.ratio)}},p=new c(r,m),v=r.src;document.querySelector(".docs-toggles").addEventListener("change",function(e){var t,o,a,n,e=e||window.event,e=e.target||e.srcElement;p&&(a="checkbox"===(e="label"===e.tagName.toLowerCase()?e.querySelector("input"):e).type,n="radio"===e.type,a||n)&&(a?(m[e.name]=e.checked,t=p.getCropBoxData(),o=p.getCanvasData(),m.ready=function(){console.log("ready"),p.setCropBoxData(t).setCanvasData(o)}):(m[e.name]=e.value,m.ready=function(){console.log("ready")}),p.destroy(),p=new c(r,m))}),e.querySelector(".docs-buttons").onclick=function(e){var t,o,a,n=e||window.event,c=n.target||n.srcElement;if(p){for(;c!==this&&!c.getAttribute("data-method");)c=c.parentNode;if(!(c===this||c.disabled||-1<c.className.indexOf("disabled"))&&(a={method:c.getAttribute("data-method"),target:c.getAttribute("data-target"),option:c.getAttribute("data-option")||void 0,secondOption:c.getAttribute("data-second-option")||void 0},t=p.cropped,a.method)){if(void 0!==a.target&&(o=document.querySelector(a.target),!c.hasAttribute("data-option"))&&a.target&&o)try{a.option=JSON.parse(o.value)}catch(n){console.log(n.message)}switch(a.method){case"rotate":t&&0<m.viewMode&&p.clear();break;case"getCroppedCanvas":try{a.option=JSON.parse(a.option)}catch(n){console.log(n.message)}a.option||(a.option={}),a.option.fillColor="#fff"}switch(e=p[a.method](a.option,a.secondOption),a.method){case"rotate":t&&0<m.viewMode&&p.crop();break;case"scaleX":case"scaleY":c.setAttribute("data-option",-a.option);break;case"destroy":p=null,d&&(i.revokeObjectURL(d),d="",r.src=v)}if("object"==typeof e&&e!==p&&o)try{o.value=JSON.stringify(e)}catch(n){console.log(n.message)}}}},document.body.onkeydown=function(e){var t=e||window.event;if(t.target===this&&p&&!(300<this.scrollTop))switch(t.keyCode){case 37:t.preventDefault(),p.move(-1,0);break;case 38:t.preventDefault(),p.move(0,-1);break;case 39:t.preventDefault(),p.move(1,0);break;case 40:t.preventDefault(),p.move(0,1)}}};