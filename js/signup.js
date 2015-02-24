var PROXY = "https://rww.io/proxy?uri={uri}";

// add CORS proxy
$rdf.Fetcher.crossSiteProxyTemplate=PROXY;

var TIMEOUT = 90000;

var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
var WS = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

// list of default workspaces to be created
var workspaces = ['Preferences', 'Public', 'Private', 'Family', 'Friends', 'Work'];

// Authenticate user to find out the user's final WebID
// string account (https://user.rww.io/)
// bool   dom     (append info to dom)
function authWebID(account, dom) {
  if (dom) {
    var d = document.querySelector("webid-signup");
  }
  if (account.lastIndexOf('/') < 0 || account.lastIndexOf('/') < account.length - 1) {
    account = account + '/';
  }

  var xhr = new XMLHttpRequest();
  xhr.open("HEAD", account, true);
  xhr.withCredentials = true;
  xhr.send();

  xhr.onreadystatechange = function () {
    if (xhr.readyState == xhr.DONE) {
      if (xhr.status < 500) {
        user = xhr.getResponseHeader('User');
        if (user) {
          // auth object
          if (user.substr(0, 4) === 'http') {
            if (dom) {
              d.appendElement(d.$.profilestatus, '<p>Authenticating with your WebID...<core-icon icon="done" class="greencolor"></core-icon></p>');
              window.scrollTo(0,document.body.scrollHeight);
            }
            finishAccount(user, account, dom);
          } else {
            // Auth failed
            if (dom) {
              d.appendElement(d.$.profilestatus, '<p>Authentication failed. Try using the <a href="https://auth.my-profile.eu/auth/index.php?verbose=on" target="_blank">debugger</a> to find the cause.</p>');
              window.scrollTo(0,document.body.scrollHeight);
            }
          }
        }
      } else {
        console.log("Could not authenticate "+webid);
      }
    }
  };
};


// Finish setting up the account
// string WebID   (https://user.rww.io/profile/card#me)
// string account (https://user.rww.io/)
// bool   dom     (append info to dom)
function finishAccount(webid, account, dom) {
  if (dom) {
    var d = document.querySelector("webid-signup");
    d.$.finishlogin.hidden = true;
  }

  var wsCount = { counter: 0,
                  webid: webid,
                  account: account
                };

  workspaces.forEach(function(ws) {
    if (dom) {
      d.appendElement(d.$.profilestatus, '<p id="'+ws+'" hidden>Creating default workspace: <em>'+
        ws+'</em>...<core-icon id="done'+ws+
        '" icon="done" class="greencolor" hidden></core-icon></p><p id="acl'+
        ws+'" hidden>Setting ACLs for '+ws+'...<core-icon id="acldone'+ws+'" icon="done" class="greencolor"></core-icon></p>');
      window.scrollTo(0,document.body.scrollHeight);
    }
    createWS(ws, wsCount, webid, account, dom);
  });

  // observer for the workspace counter
  Object.observe(wsCount, function(changes) {
    changes.forEach(function(change) {
      if (change.object.counter === workspaces.length) {
        createPref(wsCount.webid, wsCount.account, dom);
      } else {
        // console.log("workspaces done: "+change.object.counter);
      }
    });
  });
};

// Create a new workspace
// string ws      (workspace name -- e.g. Friends)
// object wsCount (workspace counter object)
// string WebID   (https://user.rww.io/profile/card#me)
// string account (https://user.rww.io/)
// bool   dom     (append info to dom)
function createWS(ws, wsCount, webid, account, dom) {
  if (dom) {
    var d = document.querySelector("webid-signup");
    d.$.profilestatus.querySelector('#'+ws).hidden = false;
  }

  var uri = account+ws+'/';
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
        setACL(uri, aclURI, webid, ws, dom);
        if (dom) {
          d.$.profilestatus.querySelector('#done'+ws).hidden = false;
          window.scrollTo(0,document.body.scrollHeight);
        }
        wsCount.counter++;
      } else {
        console.log("Could not create "+ws+" | HTTP status: "+xhr.status);
      }
    }
  };
};

// Set acls for a given resource
// string uri    (https://user.rww.io/Friends/)
// string aclURI (https://user.rww.io/Friends/,acl)
// string WebID  (https://user.rww.io/profile/card#me)
// bool   dom    (append info to dom)
function setACL(uri, aclURI, webid, ws, dom) {
  if (dom) {
    var d = document.querySelector("webid-signup");
    d.$.profilestatus.querySelector('#acl'+ws).hidden = false;
  }

  var g = new $rdf.graph();

  // Owner ACLs
  g.add($rdf.sym("#owner"), RDF("type"), WAC('Authorization'));
  g.add($rdf.sym("#owner"), WAC("accessTo"), $rdf.sym(uri));
  g.add($rdf.sym("#owner"), WAC("accessTo"), $rdf.sym(aclURI));
  g.add($rdf.sym("#owner"), WAC("agent"), $rdf.sym(webid));
  g.add($rdf.sym("#owner"), WAC("defaultForNew"), $rdf.sym(uri));
  g.add($rdf.sym("#owner"), WAC("mode"), WAC('Read'));
  g.add($rdf.sym("#owner"), WAC("mode"), WAC('Write'));
  g.add($rdf.sym("#owner"), WAC("mode"), WAC('Control'));

  if (ws == 'Public') {
    g.add($rdf.sym("#"+ws), RDF("type"), WAC('Authorization'));
    g.add($rdf.sym("#"+ws), WAC("accessTo"), $rdf.sym(uri));
    g.add($rdf.sym("#"+ws), WAC("agentClass"), FOAF("Agent"));
    g.add($rdf.sym("#"+ws), WAC("defaultForNew"), $rdf.sym(uri));
    g.add($rdf.sym("#"+ws), WAC("mode"), WAC('Read'));
    g.add($rdf.sym("#"+ws), WAC("mode"), WAC('Write'));
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
        if (dom) {
          d.$.profilestatus.querySelector('#acldone'+ws).hidden = false;
          window.scrollTo(0,document.body.scrollHeight);
        }
      } else {
        console.log("Could not write ACL "+aclURI+" | HTTP status: "+xhr.status);
      }
    }
  };
};

// Create the preferences file
// string WebID   (https://user.rww.io/profile/card#me)
// string account (https://user.rww.io/)
// bool   dom     (append info to dom)
function createPref(webid, account, dom) {
  console.log("Creating preferences");

  var exists = false;
  if (dom) {
    var d = document.querySelector("webid-signup");
    d.appendElement(d.$.profilestatus, '<p>Updating preferences file...<core-icon id="prefdone" icon="done" class="greencolor" hidden></core-icon></p>');
    exists = d.$.haveWebID.checked;
  }

  var g = new $rdf.graph();
  if (!exists) {
    g.add($rdf.sym(webid), WS('preferencesFile'), $rdf.sym(''));  
  }
  workspaces.forEach(function(workspace) {
    g.add($rdf.sym(webid), WS('workspace'), $rdf.sym(account+workspace+'/'));
  });
  
  var prefURI = account+'Preferences/prefs';
  var s = new $rdf.Serializer(g).toN3(g);

  if (exists) {
    // fetch profile and append to preferences graph
    var kb = new $rdf.graph();
    var kf = new $rdf.fetcher(kb, TIMEOUT);
    var docURI = webid.slice(0, webid.indexOf('#'));

    kf.nowOrWhenFetched(docURI,undefined,function(ok, body, xhr) {
      if (!ok) {
        console.log("Could not load profile: HTTP "+xhr.status);
      } else {
        p = kb.any($rdf.sym(webid), WS('preferencesFile'));
        if (p && p.value.length > 0) {
          prefURI = p.value;
          // fetch preferences file from profile
          pg = new $rdf.graph();
          var f = new $rdf.fetcher(pg, TIMEOUT);
          f.nowOrWhenFetched(prefURI,undefined,function(ok, body, xhr) {
            var triples = pg.statementsMatching(undefined, undefined, undefined, $rdf.sym(prefURI));
            // add existing triples from pref file
            triples.forEach(function(st) {
              g.addStatement(st);
            });
            s = new $rdf.Serializer(g).toN3(g);
            writePref(prefURI, s, exists, dom);
          });
        } else {
          writePref(prefURI, s, exists, dom);
        }
      }
    });
  } else {
    writePref(prefURI, s, exists, dom);
  }
}

// update WebID profile to include the preferences file
// string WebID   (https://user.rww.io/profile/card#me)
// string prefURI (https://user.rww.io/Preferences/prefs)
// bool   dom     (append info to dom)
function writePref(prefURI, graph, exists, dom) {
  if (dom) {
    var d = document.querySelector("webid-signup");    
  }
  var xhr = new XMLHttpRequest();
  xhr.open("PUT", prefURI, true);
  xhr.setRequestHeader("Content-Type", "text/turtle");
  xhr.withCredentials = true;
  xhr.send(graph);

  xhr.onreadystatechange = function () {
    if (xhr.readyState == xhr.DONE) {
      if (xhr.status == 200 || xhr.status == 201) {
          if (dom) {
            d.$.profilestatus.querySelector('#prefdone').hidden = false;
            if (exists) {
              d.$.alldone.hidden = false;
            }
            window.scrollTo(0,document.body.scrollHeight);
          } else {
            updateProfile(webid, account+'Preferences/prefs', dom);
          }
      } else {
        console.log("Could not write pref file "+account+"Preferences/prefs | HTTP status: "+xhr.status);
      }
    }
  };
};

// update WebID profile to include the preferences file
// string WebID   (https://user.rww.io/profile/card#me)
// string prefURI (https://user.rww.io/Preferences/prefs)
// bool   dom     (append info to dom)
function updateProfile(webid, prefURI, dom) {
  if (dom) {
    var d = document.querySelector("webid-signup");
    d.appendElement(d.$.profilestatus, '<p>Updating WebID profile...<core-icon id="profdone" icon="done" class="greencolor" hidden></core-icon></p>');
  }

  var g = new $rdf.graph();
  var kb = new $rdf.graph();
  var f = new $rdf.fetcher(kb, TIMEOUT);
  var docURI = webid.slice(0, webid.indexOf('#'));

  f.nowOrWhenFetched(docURI,undefined,function(ok, body, xhr) {
    if (ok) {
      var triples = kb.statementsMatching(undefined, undefined, undefined, $rdf.sym(docURI));
      // add existing triples from profile
      triples.forEach(function(st) {
        g.addStatement(st);
      });
      // add link to preference file
      g.add($rdf.sym(webid), WS('preferencesFile'), $rdf.sym(prefURI));
      var s = new $rdf.Serializer(g).toN3(g);

      // update profile
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", docURI, true);
      xhr.setRequestHeader("Content-Type", "text/turtle");
      xhr.withCredentials = true;
      xhr.send(s);

      xhr.onreadystatechange = function () {
        if (xhr.readyState == xhr.DONE) {
          if (xhr.status == 200 || xhr.status == 201) {
            if (dom) {
              d.$.profilestatus.querySelector('#profdone').hidden = false;
              d.$.alldone.hidden = false;
              window.scrollTo(0,document.body.scrollHeight);
            }
          } else {
            console.log("Could not write profile file "+docURI+" | HTTP status: "+xhr.status);
          }
        }
      };
    }
  });
};

// helper function used by the Link header parser
function unquote(value) {
  if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
  return value;
};

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
};