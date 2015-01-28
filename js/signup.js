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
var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");

var workspaces = [
        { name: 'Preferences', mode: null, created: false },
        { name: 'Public', mode: 'Read', created: false },
        { name: 'Private', mode: null, created: false },
        { name: 'Family', mode: null, created: false },
        { name: 'Friends', mode: null, created: false },
        { name: 'Work', mode: null, created: false }
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
  var d = document.querySelector("webid-signup");
  d.$.finishlogin.hidden = true;

  wsCount.webid = webid;
  wsCount.account = account;
  for (i in workspaces) {
    var ws = workspaces[i];
    appendElement(logElem, '<p id="'+ws.name+'" hidden>Creating default workspace: <em>'+
      ws.name+'</em>...<core-icon id="done'+ws.name+
      '" icon="done" class="greencolor" hidden></core-icon></p><p id="acl'+
      ws.name+'" hidden>Setting ACLs...<core-icon id="acldone'+ws.name+'" icon="done" class="greencolor"></core-icon></p>');
    createWS(ws, webid, account);
  }
}

function createWS(ws, webid, account) {
  var d = document.querySelector("webid-signup");
  d.$.profilestatus.querySelector('#'+ws.name).hidden = false;

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
      if (xhr.status == 200 || xhr.status == 201) {
        var acl = parseLinkHeader(xhr.getResponseHeader('Link'));
        var aclURI = acl['acl']['href'];
        setACL(uri, aclURI, webid, ws, true);
        d.$.profilestatus.querySelector('#done'+ws.name).hidden = false;
      } else {
        console.log("Could not create "+ws+" | HTTP status: "+xhr.status);
      }
    }
  }
}

function setACL(uri, aclURI, webid, ws, isdir) {
  var g = new $rdf.graph();

  // Owner ACLs
  g.add($rdf.sym("#owner"), RDF("type"), WAC('Authorization'));
  g.add($rdf.sym("#owner"), WAC("accessTo"), $rdf.sym(uri));
  g.add($rdf.sym("#owner"), WAC("accessTo"), $rdf.sym(aclURI));
  g.add($rdf.sym("#owner"), WAC("agent"), $rdf.sym(webid));
  if (isdir) {
    g.add($rdf.sym("#owner"), WAC("defaultForNew"), $rdf.sym(uri));
  }
  g.add($rdf.sym("#owner"), WAC("mode"), WAC('Read'));
  g.add($rdf.sym("#owner"), WAC("mode"), WAC('Write'));
  g.add($rdf.sym("#owner"), WAC("mode"), WAC('Control'));

  if (ws.mode) {
    g.add($rdf.sym("#"+ws.mode), RDF("type"), WAC('Authorization'));
    g.add($rdf.sym("#"+ws.mode), WAC("accessTo"), $rdf.sym(uri));
    g.add($rdf.sym("#"+ws.mode), WAC("agentClass"), FOAF("Agent"));
    if (isdir) {
      g.add($rdf.sym("#"+ws.mode), WAC("defaultForNew"), $rdf.sym(uri));
    }
    g.add($rdf.sym("#"+ws.mode), WAC("mode"), WAC(ws.mode));
  }
  var s = new $rdf.Serializer(g).toN3(g);

  var xhr = new XMLHttpRequest();
  xhr.open("PUT", aclURI, true);
  xhr.setRequestHeader("Content-Type", "text/turtle");
  xhr.withCredentials = true;
  xhr.send(s);

  xhr.onreadystatechange = function () {
    if (xhr.readyState == xhr.DONE) {
      if (xhr.status == 200 || xhr.status == 201) {
        wsCount.counter++;
        d.$.profilestatus.querySelector('#acldone'+ws.name).hidden = false;
      } else {
        console.log("Could not write ACL "+aclURI+" | HTTP status: "+xhr.status);
      }
    }
  }
  var d = document.querySelector("webid-signup");
  d.$.profilestatus.querySelector('#acl'+ws.name).hidden = false;
}

var gg = null;


function createPref(webid) {
  var g = new $rdf.graph();



}

function updateProfile(webid) {
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

function unquote(value) {
  if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
  return value;
}
// parse a Link header
function parseLinkHeader(header) {
    var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
  var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

  var matches = header.match(linkexp);
  var rels = new Object();
  for (i = 0; i < matches.length; i++) {
    var split = matches[i].split('>');
    var href = split[0].substring(1);
    var ps = split[1];
    var link = new Object();
    link.href = href;
    var s = ps.match(paramexp);
    for (j = 0; j < s.length; j++) {
      var p = s[j];
      var paramsplit = p.split('=');
      var name = paramsplit[0];
      link[name] = unquote(paramsplit[1]);
    }

    if (link.rel != undefined) {
      rels[link.rel] = link;
    }
  }   
  return rels;
}