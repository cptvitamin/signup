var PROXY = "https://rww.io/proxy?uri={uri}";

// add CORS proxy
$rdf.Fetcher.crossSiteProxyTemplate=PROXY;

var TIMEOUT = 90000;

var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var ACL = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
var MBLOG = $rdf.Namespace("http://w3.org/ns/mblog#");
var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

var workspaces = [
        { name: 'Preferences', created = false },
        { name: 'Public', created = false },
        { name: 'Private', created = false },
        { name: 'Family', created = false },
        { name: 'Friends', created = false },
        { name: 'Work', created = false }
      ];

var wsCount = { counter: 0 };

Object.observe(wsCount, function(changes) {
  changes.forEach(function(change) {
    if (change.object.counter === workspaces.length) {
      createPref(wsCount.webid, wsCount.account);
    }
  });
});

function finishAccount(webid, account, logElem) {
  wsCount.webid = webid;
  wsCount.account = account;
  for (i in workspaces) {
    var ws = workspaces[i];
    appendElement(logElem, '<p>Creating workspace: <em>'+ws.name+'</em>...<core-icon id="'+ws.name+'" icon="done" class="greencolor" hidden></core-icon></p>');
    createWS(ws, account);
  }
}

function createWS(ws, account) {
  var d = document.querySelector("webid-signup");

  // TODO: remove override
  account = "https://zomg.rww.io/";

  var uri = account+ws.name+'/';
  var xhr = new XMLHttpRequest();
  xhr.open("PUT", uri, true);
  xhr.setRequestHeader("Content-Type", "text/turtle");
  xhr.setRequestHeader("Link", '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"');
  xhr.withCredentials = true;
  xhr.send();

  xhr.onreadystatechange = function () {
    if (xhr.readyState == xhr.DONE) {
      if (xhr.status == 201) {
        wsCount.counter++;
        ws.done = true;
        d.$.profilestatus.querySelector('#'+ws.name).hidden = false;
      } else {
        console.log("Could not create "+ws+" | HTTP status: "+xhr.status);
      }
    }
  }
}

var gg = null;
function createPref(webid) {
  var ng = new $rdf.graph();
  var g = new $rdf.graph();
  var f = new $rdf.fetcher(g, TIMEOUT);
  var docURI = webid.slice(0, webid.indexOf('#'));

  f.nowOrWhenFetched(docURI,undefined,function(ok, body, xhr) {
    console.log(xhr.status);
    if (ok) {
      gg = g;
      var triples = g.statementsMatching(undefined, undefined, undefined, $rdf.sym(docURI));
      console.log("Triples: "+triples.length);

      // add existing triples from profile
      for (st in triples) {
        ng.addStatement(st);
      }

      // add link to preference file
    }
  });
}
