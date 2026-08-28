/**
 * The Umbraco UI Library elements this page uses.
 *
 * Each import is for its side effect — the module calls `customElements.define`.
 * They are listed one by one rather than pulling in the `@umbraco-ui/uui`
 * barrel, because the package marks every component as having side effects, so
 * the barrel would bundle all eighty-odd elements whether used or not.
 *
 * Adding a `uui-*` tag to index.html means adding its import here.
 */
import '@umbraco-ui/uui/components/box/box.js';
import '@umbraco-ui/uui/components/button/button.js';
import '@umbraco-ui/uui/components/icon/icon.js';
import '@umbraco-ui/uui/components/icon-registry-essential/icon-registry-essential.js';
import '@umbraco-ui/uui/components/input/input.js';
import '@umbraco-ui/uui/components/label/label.js';
import '@umbraco-ui/uui/components/table/table.js';
import '@umbraco-ui/uui/components/tag/tag.js';
import '@umbraco-ui/uui/components/textarea/textarea.js';
import '@umbraco-ui/uui/components/toast-notification/toast-notification.js';
import '@umbraco-ui/uui/components/toast-notification-container/toast-notification-container.js';
import '@umbraco-ui/uui/components/toast-notification-layout/toast-notification-layout.js';
