(window.webpackJsonp=window.webpackJsonp||[]).push([[26],{72:function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;s(r(3));var a,o=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)if(Object.prototype.hasOwnProperty.call(e,r)){var a=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(e,r):{};a.get||a.set?Object.defineProperty(t,r,a):t[r]=e[r]}return t.default=e,t}(r(0)),n=s(r(2)),i=s(r(80));function s(e){return e&&e.__esModule?e:{default:e}}function l(e,t,r,o){a||(a="function"==typeof Symbol&&Symbol.for&&Symbol.for("react.element")||60103);var n=e&&e.defaultProps,i=arguments.length-3;if(t||0===i||(t={children:void 0}),t&&n)for(var s in n)void 0===t[s]&&(t[s]=n[s]);else t||(t=n||{});if(1===i)t.children=o;else if(i>1){for(var l=new Array(i),c=0;c<i;c++)l[c]=arguments[c+3];t.children=l}return{$$typeof:a,type:e,key:void 0===r?null:""+r,ref:null,props:t,_owner:null}}function c(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function u(){return(u=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var a in r)Object.prototype.hasOwnProperty.call(r,a)&&(e[a]=r[a])}return e}).apply(this,arguments)}const d={"../images/auto.gif":()=>r.e(17).then(r.t.bind(null,105,7))};const h=e=>{var t,r;return r=t=class extends o.default.Component{constructor(...e){super(...e),c(this,"state",{Comp:null})}componentDidMount(){!this.state.Comp&&this.props.shouldLoad&&e().then(e=>{this.setState({Comp:e.default})})}render(){const{Comp:e}=this.state;return e?o.default.createElement(e,this.props,this.props.children||null):null}},c(t,"defaultProps",{shouldLoad:!0}),r};h(()=>r.e(29).then(r.bind(null,81))),h(()=>r.e(29).then(r.bind(null,82)));var f=l("section",{},void 0,l("p",{},void 0,l(class extends o.default.Component{constructor(...e){super(...e),c(this,"state",{image:null,ImageProvider:d[this.props.src]})}componentDidMount(){this.state.image||this.state.ImageProvider().then(e=>{this.setState({image:e.default})})}render(){let{image:e}=this.state;return e&&"object"==typeof e?o.default.createElement(i.default,u({},this.props,{className:(0,n.default)("image",this.props.className),src:e.src.src,width:e.src.width||e.width,height:e.src.height||e.height,placeholder:{lqip:e.preSrc},srcSet:e.src.images?e.src.images.map(e=>(function(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{},a=Object.keys(r);"function"==typeof Object.getOwnPropertySymbols&&(a=a.concat(Object.getOwnPropertySymbols(r).filter(function(e){return Object.getOwnPropertyDescriptor(r,e).enumerable}))),a.forEach(function(t){c(e,t,r[t])})}return e})({},e,{src:e.path})):[{src:e.src,width:e.width}]})):l("img",{className:(0,n.default)("image",this.props.className),src:e})}},{src:"../images/auto.gif",alt:"Markdown",className:"header-image"})),l("h1",{className:"has-text-centered"},void 0,"🚀 auto 🚀"),l("p",{},void 0,"Automated releases powered by pull request labels. Streamline you release workflow and publish constantly! ",l("code",{},void 0,"auto")," is meant to be run in a continuos integration (CI) environment, but all the commands work locally as well."),l("p",{},void 0,"Release Features:"),l("ul",{},void 0,l("li",{},void 0,"Calculate semantic version bumps from PRs"),l("li",{},void 0,"Skip a release with the ",l("code",{},void 0,"skip-release")," label"),l("li",{},void 0,"Publish canary releases from PRs or locally"),l("li",{},void 0,"Generate changelogs with fancy headers, authors, and monorepo package association"),l("li",{},void 0,"Use labels to create new changelog section"),l("li",{},void 0,"Generate a GitHub release")),l("p",{},void 0,"Pull Request Interaction Features:"),l("ul",{},void 0,l("li",{},void 0,"Get the labels for a PR"),l("li",{},void 0,"Set the status of a PR"),l("li",{},void 0,"Check that a pull request has a SemVer label"),l("li",{},void 0,"Comment on a PR with markdown")));var m=e=>l("div",{className:e.className},void 0,f);t.default=m,e.exports=t.default}}]);
//# sourceMappingURL=introduction.js.map