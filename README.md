WebID Login/Signup
==================

WebID login/singup application.

Runing live here: http://linkeddata.github.io/signup/

Quick Start
-----------

```
$ git clone git://github.com/linkeddata/signup
$ cd signup
$ sudo npm -g install bower
$ bower install
```

Individual Components
---------------------

If you would like to only use a particular component (i.e. login or signup), then you only need to include the minified version of the webcomponents script together with the corresponding component code, and then use the html tag in your page. For example, let's say you only want to use the signup component (replace with the actual version of the webcomponents.js script, e.g. 0.5.2):

```
<html>
<head>
	<script src="//cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/<version>/webcomponents.min.js"></script>
	<link rel="import" href="signup.html">
</head>
<body>
	<webid-signup></webid-signup>
</body>
</html>
```

Login
=====

The login component currently authenticates users through WebID-TLS. Once the authentication has been performed, a CustomEvent function is used to trigger and propagate the auth outcome to the parent window. Here is the structure of the *WebIDAuth* event object:

```
WebIDAuth : { details: { 
						auth: string, // type of auth method (i.e. WebID-TLS)
						success: bool, // true if auth was successful
						user: string // the WebID of the user
					}
			}
```


To listen to the event, one can add a very simple event listener in the document that uses the login component (replace with the actual version of the webcomponents.js script, e.g. 0.5.2):

```
<html>
<head>
	<script src="//cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/<version>/webcomponents.min.js"></script>
	<link rel="import" href="login.html">
</head>
<body>
	<webid-login></webid-login>
	<script>
		// Listen to WebIDAuth events
		window.addEventListener('WebIDAuth',function(e) {
			console.log(e.detail);
			if (e.detail.success === true) {
				console.log("Auth successful! WebID: "+e.detail.user);
			} else {
				console.log("Auth failed!");
				console.log(e.detail);
			}
		},false);
	</script>
</body>
</html>
```

Signup
======

Some support must implemented on the server to make it compatible with the signup component. The only assumption is that servers willing to provide new accounts are already [Linked Data Platform 1.0](http://www.w3.org/TR/ldp/) compliant, and of course, [WebID](www.w3.org/2005/Incubator/webid/spec/identity/) and [WebID-TLS](http://www.w3.org/2005/Incubator/webid/spec/tls) compliant.


Client - server API
-------------------

The signup component requires that servers implement a very simple API, indicating whether an account name is available or not on the server. Clients (i.e. the signup component) send an HTTP POST request containing the following JSON structure, where *accountName* contains the target account name (e.g. user):

```
{
	method:		 "accountStatus",
	accountName: "user"
}
```

The server response has to contain the following JSON structure:

```
{
	method:   "accountStatus",
	status:	  "success",
	formuri:  "http://example.org/api/spkac",
	response: {
				accountName: "user",
				available:	 true
			}
}
```

If the *status* indicates success, and *available* is set to *true*, then the form containing user details can finally be submitted, using the URI provided by the server (i.e. the value of *formuri*).

Creating additional resources
-----------------------------

Once the WebID certificate is installed in the browser, the user is presented with a button that finishes setting up the account when clicked. At the end, the user ends up with a series of default workspaces, access control policies (ACLs) for them, and a *preferences* file.

Workspaces
----------

Using the LDP standard, a series of dedicated containers (i.e. workspaces) are created on the user's data server. At the moment, the list is limited to the following workspaces:

 * Public
 * Private
 * Work
 * Family
 * Friends
 * Preferences

ACLs
----

When a resource is created by the signup component, a corresponding ACL resource is also created. To help discover the URI of the ACL resource, servers must provide a Link header with the *rel* value set to *acl*:

REQUEST:
```
PUT /Work/ HTTP/1.1
Host: user.example.org
Link: <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"
```

RESPONSE:
```
HTTP/1.1 201 Created
Location: https://user.example.org/Work/
Link: <https://user.example.org/Work/,acl>; rel="acl"
```

At this point, the signup component knows where it can write the policies that match the given workspace.

Preferences resource
--------------------

The *preferences* resource is used to describe useful information about the user and the data server, which can later on be used by applications. Currently, this resource lists the workspaces that were just created. In the future it may contain user preferences such as a preferred language, date format, etc.

By default, the preferences resource will be created in the *Preferences* workspaces, having the name *prefs* -- i.e. ```https://user.example.org/Preferences/prefs```.

A triple pointing to the preferences file will also be added to the user's WebID profile.








