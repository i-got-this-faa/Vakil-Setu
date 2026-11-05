# Meta WhatsApp Cloud API setup

This is the alternative to Twilio Sandbox. Both adapters use the same conversation,
speech, legal retrieval and consultation-request services; only one messaging
provider is selected by a running backend.

## Access the app setup

Sign in to Facebook and open <https://developers.facebook.com/> in the same normal
browser. Complete developer registration if the site offers **Get Started**. Use
its **My Apps** menu to select or create an app with the WhatsApp messaging use
case. In the selected app, open WhatsApp's customization/setup area and **API Setup**.
The exact menu labels depend on the app dashboard and account access.

The setup should expose token generation and the test phone-number ID. Access
problems such as “link may be broken or page removed” must be resolved in the Meta
account before this project can generate or use a token; changing backend code
does not fix dashboard access. If the site is network-blocked, use the working
network or the already-supported Twilio Sandbox instead.

## Configure only local environment values

```dotenv
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_numeric_phone_number_id
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=a_long_random_value_you_choose
WHATSAPP_GRAPH_VERSION=the_supported_version_shown_in_your_api_setup
SPEECH_PROVIDER=local
LEGAL_REPLY_MODE=extractive
WHATSAPP_PORT=5002
PUBLIC_BASE_URL=https://your_current_public_https_origin
```

Copy the Graph API version from your current API setup, including its `v` prefix;
do not paste the descriptive placeholder above literally. The phone-number ID is
an identifier from the API setup, not your personal WhatsApp number. Obtain the app
secret from the app's own settings. The verify token is selected locally and is
entered identically in the webhook verification form; it is not the API access token.
Secrets belong in the ignored `backend/.env`, not source code or screenshots.

Run:

```bash
npm run doctor:whatsapp -- --provider meta
npm run start:meta
```

`start:meta` explicitly selects live Meta mode regardless of a demo/Twilio default
in `.env`. Local English speech requires the one-time setup documented in
[the presentation guide](WHATSAPP_DEMO.md). Model-based legal generation remains
optional; extractive mode reads cited source text without a model API key.

Expose the selected port using a working HTTPS tunnel or deployment. Configure
Meta's webhook callback to `https://<current-origin>/webhooks/whatsapp`, supply the
same verify token, and subscribe to message events. Complete the test-recipient
authorization required by your Meta setup before messaging its test number.

The webhook answers verification challenges, checks the exact request-byte HMAC
using the app secret and accepts only the configured phone-number ID. Incoming
audio is downloaded from trusted Meta media hosts. Replies upload audio through
the Graph API, so Meta does not use Twilio's temporary media URLs.

## Delivery and requests

The signed message webhook also records Meta `sent`, `delivered`, `read` and
`failed` statuses. These update message-delivery records, never advocate acceptance
or appointment confirmation. Duplicate or delayed callbacks cannot regress a
delivered/read status. The API's initial message-create response means accepted,
not delivered. Real Meta delivery has not yet been verified with project credentials.

Voice commands include **repeat**, **help**, **request status**, **cancel my
request** and **start a new case**. Cancellation of a pending request requires a
separate yes/no confirmation. Requests are stored for staff handling; no automatic
advocate notification, reserved slot or payment is implied.
