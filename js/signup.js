var PROXY = "https://rww.io/proxy?uri={uri}";

// add CORS proxy
$rdf.Fetcher.crossSiteProxyTemplate=PROXY;

var TIMEOUT = 90000;

var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
var WS = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

// list of default workspaces
var workspaces = [
        { name: 'Preferences', mode: null, created: false, uri: '' },
        { name: 'Public', mode: 'Read', created: false, uri: '' },
        { name: 'Private', mode: null, created: false, uri: '' },
        { name: 'Family', mode: null, created: false, uri: '' },
        { name: 'Friends', mode: null, created: false, uri: '' },
        { name: 'Work', mode: null, created: false, uri: '' }
      ];

var wsCount = { counter: 0 };

// observer for the workspace counter
Object.observe(wsCount, function(changes) {
  changes.forEach(function(change) {
    if (change.object.counter === workspaces.length) {
      createPref(wsCount.webid, wsCount.account);
    } else {
      // console.log("workspaces done: "+change.object.counter);
    }
  });
});

// finish setting up the account
function finishAccount(webid, account) {
  var d = document.querySelector("webid-signup");
  d.$.finishlogin.hidden = true;

  // TODO: remove override
  account = "https://zomg.rww.io/";

  wsCount.webid = webid;
  wsCount.account = account;
  for (i in workspaces) {
    var ws = workspaces[i];
    appendElement(d.$.profilestatus, '<p id="'+ws.name+'" hidden>Creating default workspace: <em>'+
      ws.name+'</em>...<core-icon id="done'+ws.name+
      '" icon="done" class="greencolor" hidden></core-icon></p><p id="acl'+
      ws.name+'" hidden>Setting ACLs for '+ws.name+'...<core-icon id="acldone'+ws.name+'" icon="done" class="greencolor"></core-icon></p>');
    createWS(ws, webid, account);
  }
}

// create a new workspace
function createWS(ws, webid, account) {
  var d = document.querySelector("webid-signup");
  d.$.profilestatus.querySelector('#'+ws.name).hidden = false;

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
        ws.uri = xhr.getResponseHeader('Location');
        var acl = parseLinkHeader(xhr.getResponseHeader('Link'));
        var aclURI = acl['acl']['href'];
        setACL(uri, aclURI, webid, ws, true);
        d.$.profilestatus.querySelector('#done'+ws.name).hidden = false;
        wsCount.counter++;
      } else {
        console.log("Could not create "+ws+" | HTTP status: "+xhr.status);
      }
    }
  }
}

// set acls for a given resource
function setACL(uri, aclURI, webid, ws, isdir) {
  var d = document.querySelector("webid-signup");
  d.$.profilestatus.querySelector('#acl'+ws.name).hidden = false;

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
        d.$.profilestatus.querySelector('#acldone'+ws.name).hidden = false;
      } else {
        console.log("Could not write ACL "+aclURI+" | HTTP status: "+xhr.status);
      }
    }
  }
}

// create the preferences file
function createPref(webid, account) {
  var d = document.querySelector("webid-signup");
  appendElement(d.$.profilestatus, '<p>Creating preferences file...<core-icon id="prefdone" icon="done" class="greencolor" hidden></core-icon></p>');
  
  var g = new $rdf.graph();
  g.add($rdf.sym(webid), WS('preferencesFile'), $rdf.sym(''));
  workspaces.forEach(function(workspace) {
    g.add($rdf.sym(webid), WS('workspace'), $rdf.sym(account+workspace.name+'/'));
  });
  
  var s = new $rdf.Serializer(g).toN3(g);

  var xhr = new XMLHttpRequest();
  xhr.open("PUT", account+'Preferences/prefs', true);
  xhr.setRequestHeader("Content-Type", "text/turtle");
  xhr.withCredentials = true;
  xhr.send(s);

  xhr.onreadystatechange = function () {
    if (xhr.readyState == xhr.DONE) {
      if (xhr.status == 200 || xhr.status == 201) {
          d.$.profilestatus.querySelector('#prefdone').hidden = false;
          updateProfile(webid, account+'Preferences/prefs');
      } else {
        console.log("Could not write pref file "+account+"Preferences/prefs | HTTP status: "+xhr.status);
      }
    }
  }
}

// update WebID profile to include the preferences file
function updateProfile(webid, prefURI) {
  var d = document.querySelector("webid-signup");
  appendElement(d.$.profilestatus, '<p>Updating WebID profile...<core-icon id="profdone" icon="done" class="greencolor" hidden></core-icon></p>');
  

  var ng = new $rdf.graph();
  var g = new $rdf.graph();
  var f = new $rdf.fetcher(g, TIMEOUT);
  var docURI = webid.slice(0, webid.indexOf('#'));

  f.nowOrWhenFetched(docURI,undefined,function(ok, body, xhr) {
    if (ok) {
      var triples = g.statementsMatching(undefined, undefined, undefined, $rdf.sym(docURI));
      // add existing triples from profile
      triples.forEach(function(st) {
        ng.addStatement(st);
      });
      // add link to preference file
      ng.add($rdf.sym(webid), WS('preferencesFile'), $rdf.sym(prefURI));
      var s = new $rdf.Serializer(ng).toN3(ng);

      // update profile
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", docURI, true);
      xhr.setRequestHeader("Content-Type", "text/turtle");
      xhr.withCredentials = true;
      xhr.send(s);

      xhr.onreadystatechange = function () {
        if (xhr.readyState == xhr.DONE) {
          if (xhr.status == 200 || xhr.status == 201) {
              d.$.profilestatus.querySelector('#profdone').hidden = false;
              d.$.alldone.hidden = false;
          } else {
            console.log("Could not write profile file "+docURI+" | HTTP status: "+xhr.status);
          }
        }
      }
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