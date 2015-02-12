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

Supported service providers
---------------------------

The signup component already comes with a list of predefined service providers (called *Servers* for the sake of simplicity). If you would like to override this list in order to user your local server, you can pass some additional URL parameters when you load the component. The parameters are:
 * ```endpointUrl``` - an urlEncoded endpoint that implements the account status API below
 * ```endpointName``` - a common name for the endpoint; if no name is provided, it will default to the host name
 * ```flagISO``` - a country code in the [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1) Alpha-2 format (e.g. FR, DE, US )

For example, if the signup component is located at ```https://linkeddata.github.io/signup/```, and if you have a service provider endpoint at ```https://example.org/api/accountStatus```, and let's say it is located in Germany, then the corresponding override URL will be:

```
https://linkeddata.github.io/signup/?endpointUrl=https%3a%2f%2fexample.org%2fapi%2faccountStatus&flagISO=de
```

Remember that if provided, the new service provider defined by endpointUrl will become the default in the list.

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
	formURI:  "https://example.org/api/spkac",
	loginURI: "https://example.org/",
	response: {
				accountURL: "https://user.example.org/",
				available:	 true
			}
}
```

**Attention!** Because creating client certificates requires the &lt;keygen&gt; element, which does not work with AJAX requests, the client must submit a form to the *formURI* it receives from the server. This restriction means that a predefined set of form element names must be respected on the server. Here is a list of form element names  (case sensitive!) that are sent by the signup component:

 * ```spkac``` - SPKAC containing the public key generated by the keygen element
 * ```username``` - account user name
 * ```name``` - user's full name
 * ```email``` - user's email address
 * ```img``` - user's picture URL

Finally, if the *status* indicates success, and *available* is set to *true*, then the form containing user details can be submitted, using the URI provided by the server (i.e. the value of *formuri*).

The value of loginURI is used to indicate where the app can fake a WebID-TLS login, in order to find the user's WebID.

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








