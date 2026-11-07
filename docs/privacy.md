# Changeboard privacy and data behavior

Draft policy for this implementation, 25 October 2026. Changeboard is an independent application using Buffer's API.

We store the event details you confirm, selected captions and their source snapshots, channel/publication metadata, exact fact associations, proposed revisions and operation outcomes. Buffer account/organization/channel information is used to authorize the campaign. Access and refresh tokens are encrypted server-side. Tokens are never placed in the browser's localStorage or sent to the frontend.

Connection records keep a bounded history of 12 API request/response receipts without authorization headers or tokens. These can include your selected captions and are private application records. We do not use caption text as executable instructions or send it to an AI extraction service. AI extraction and OCR are not enabled in this release.

Uploaded/generated posters are deliberately public at unguessable, immutable media URLs so Buffer can fetch them. Upload only images intended for publication. Unreferenced uploads can be deleted with local data; assets potentially referenced by a successful or uncertain operation are retained to avoid breaking scheduled posts. Automatic verification of later remote asset release is not implemented; retained assets require operator review before removal.

Disconnect deletes Changeboard's locally stored Buffer credential pair. It does not alter or unschedule Buffer posts, and it does not revoke the grant at Buffer: use Buffer's connected-app settings for revocation. Deleting local data removes campaign facts, snapshots, associations, operations and credentials for this local owner. It does not edit or delete remote posts. Referenced public images can remain hosted as described above.

Sessions use HttpOnly, SameSite cookies; production requires HTTPS and Secure cookies. Browser restart resumes the same valid session. An expired session requires reconnecting; authenticated Buffer identities resolve to their own local workspace. Anonymous samples are local to their session.

No advertising, payment collection, analytics service or ongoing monitoring of your posts is included. Accuracy is based on the last observed Buffer state; later external changes require a deliberate refresh and review.
