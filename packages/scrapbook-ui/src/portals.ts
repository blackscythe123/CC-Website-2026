// The portal registry is the single source of truth for deployed portal domains.
import portals from '../../../content/club/portals.json';

type Portal = {id: string; domain: string; isDefault?: boolean};
const registry = portals as Portal[];
const main = registry.find(portal => portal.isDefault) ?? registry.find(portal => portal.id === 'main-portal');

/** Origin of the main portal (the `isDefault` entry of content/club/portals.json). */
export const mainPortalUrl = main ? `https://${main.domain}` : '';
/** Where vertical portals send "back to all verticals". */
export const mainPortalVerticalsUrl = `${mainPortalUrl}/#section-verticals`;
