import {
  and,
  between,
  count,
  countDistinct,
  desc,
  eq,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { analyticsVisits } from "@/lib/db/schema";

export type AnalyticsRange = { from: Date; to: Date };

function humanRangeClause(from: Date, to: Date) {
  return between(analyticsVisits.occurredAt, from, to);
}

export async function getAnalyticsSummary(
  range: AnalyticsRange,
  includeBots: boolean,
) {
  const baseWhere = and(
    humanRangeClause(range.from, range.to),
    includeBots ? undefined : eq(analyticsVisits.isBot, false),
  );

  const [totals] = await db
    .select({
      visits: count(),
      visitors: countDistinct(analyticsVisits.visitorHash),
    })
    .from(analyticsVisits)
    .where(baseWhere);

  const [bots] = await db
    .select({ c: count() })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        eq(analyticsVisits.isBot, true),
      ),
    );

  return {
    visits: Number(totals?.visits ?? 0),
    approximateUniqueVisitors: Number(totals?.visitors ?? 0),
    botVisits: Number(bots?.c ?? 0),
  };
}

export async function getVisitsByMonth(
  range: AnalyticsRange,
  includeBots: boolean,
) {
  return db
    .select({
      ym: sql<string>`DATE_FORMAT(${analyticsVisits.occurredAt}, '%Y-%m')`.as(
        "ym",
      ),
      visits: sql<number>`count(*)`.mapWith(Number),
      visitors:
        sql<number>`count(distinct ${analyticsVisits.visitorHash})`.mapWith(
          Number,
        ),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(sql`DATE_FORMAT(${analyticsVisits.occurredAt}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${analyticsVisits.occurredAt}, '%Y-%m')`);
}

export async function getTopCountries(
  range: AnalyticsRange,
  includeBots: boolean,
  limit = 15,
) {
  return db
    .select({
      code: sql<string>`coalesce(${analyticsVisits.countryCode}, '??')`.as(
        "code",
      ),
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(sql`coalesce(${analyticsVisits.countryCode}, '??')`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getTopPaths(
  range: AnalyticsRange,
  includeBots: boolean,
  limit = 20,
) {
  return db
    .select({
      path: analyticsVisits.path,
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(analyticsVisits.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getTopReferrers(
  range: AnalyticsRange,
  includeBots: boolean,
  limit = 15,
) {
  return db
    .select({
      host:
        sql<string>`coalesce(${analyticsVisits.referrerHost}, '(direktno ili bez referrer-a)')`.as(
          "host",
        ),
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(
      sql`coalesce(${analyticsVisits.referrerHost}, '(direktno ili bez referrer-a)')`,
    )
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getDeviceBreakdown(
  range: AnalyticsRange,
  includeBots: boolean,
) {
  return db
    .select({
      deviceType: analyticsVisits.deviceType,
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(analyticsVisits.deviceType)
    .orderBy(desc(sql`count(*)`));
}

export async function getBrowserBreakdown(
  range: AnalyticsRange,
  includeBots: boolean,
  limit = 10,
) {
  return db
    .select({
      browser: sql<string>`coalesce(${analyticsVisits.browser}, 'nepoznato')`.as(
        "b",
      ),
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(sql`coalesce(${analyticsVisits.browser}, 'nepoznato')`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getOsBreakdown(
  range: AnalyticsRange,
  includeBots: boolean,
  limit = 10,
) {
  return db
    .select({
      os: sql<string>`coalesce(${analyticsVisits.osName}, 'nepoznato')`.as(
        "os",
      ),
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(sql`coalesce(${analyticsVisits.osName}, 'nepoznato')`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getVisitsByHourOfDay(
  range: AnalyticsRange,
  includeBots: boolean,
) {
  return db
    .select({
      hour: sql<number>`HOUR(${analyticsVisits.occurredAt})`.mapWith(Number),
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(sql`HOUR(${analyticsVisits.occurredAt})`)
    .orderBy(sql`HOUR(${analyticsVisits.occurredAt})`);
}

export async function getVisitsByLocale(
  range: AnalyticsRange,
  includeBots: boolean,
) {
  return db
    .select({
      locale: sql<string>`coalesce(${analyticsVisits.locale}, '—')`.as("loc"),
      visits: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analyticsVisits)
    .where(
      and(
        humanRangeClause(range.from, range.to),
        includeBots ? sql`1=1` : eq(analyticsVisits.isBot, false),
      ),
    )
    .groupBy(sql`coalesce(${analyticsVisits.locale}, '—')`)
    .orderBy(desc(sql`count(*)`));
}
