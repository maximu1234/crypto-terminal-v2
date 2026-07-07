import {
  restDeleteCount,
  restGet
} from "./supabase-rest.js";
import {
  invalidateTelegramAlertsReloadCache
} from "./alerts-db.js";

function alertKeepKey(
  symbol,
  shapeId
) {

  return `${String(symbol || "").trim().toUpperCase()}::${String(shapeId || "").trim()}`;

}

function buildKeepSet(
  keepActive
) {

  const set =
    new Set();

  for (
    const row of
    keepActive ||
    []
  ) {
    const key =
      alertKeepKey(
        row.symbol,
        row.shape_id ||
        row.shapeId
      );

    if (
      key !==
      "::"
    ) {
      set.add(
        key
      );
    }
  }

  return set;

}

async function deletePriceAlertsByIds(
  ids
) {

  if (
    !ids?.length
  ) {
    return 0;
  }

  let total =
    0;

  for (
    let i =
    0;
    i <
    ids.length;
    i +=
    40
  ) {
    const chunk =
      ids.slice(
        i,
        i +
        40
      );
    const filter =
      chunk
        .map(
          id=>
          encodeURIComponent(
            id
          )
        )
        .join(
          ","
        );

    total +=
      await restDeleteCount(
        `price_alerts?id=in.(${filter})`
      );
  }

  return total;

}

/**
 * Очистка мусора алертов в Supabase для одного пользователя.
 * @param {string} userId
 * @param {Array<{symbol:string, shape_id?:string, shapeId?:string}>} keepActive
 */
export async function purgeAlertGarbageForUser(
  userId,
  keepActive = []
) {

  if (
    !userId
  ) {
    return {
      deletedZombies: 0,
      deletedSoft: 0,
      deletedOrphans: 0,
      deletedEvents: 0
    };
  }

  const uid =
    encodeURIComponent(
      userId
    );
  const keepSet =
    buildKeepSet(
      keepActive
    );

  const deletedZombies =
    await restDeleteCount(
      `price_alerts?user_id=eq.${uid}&triggered_at=not.is.null`
    );

  let deletedSoft =
    0;

  try{
    deletedSoft =
      await restDeleteCount(
        `price_alerts?user_id=eq.${uid}&deleted_at=not.is.null`
      );
  }catch(
    err
  ){
    if (
      !String(
        err?.message ||
        ""
      ).includes(
        "deleted_at"
      )
    ) {
      throw err;
    }
  }

  let activeRows;

  try{
    activeRows =
      await restGet(
        `price_alerts?user_id=eq.${uid}` +
        `&triggered_at=is.null` +
        `&deleted_at=is.null` +
        `&select=id,symbol,shape_id`
      );
  }catch(
    err
  ){
    if (
      String(
        err?.message ||
        ""
      ).includes(
        "deleted_at"
      )
    ) {
      activeRows =
        await restGet(
          `price_alerts?user_id=eq.${uid}` +
          `&triggered_at=is.null` +
          `&select=id,symbol,shape_id`
        );
    } else {
      throw err;
    }
  }

  const orphanIds =
    (
      activeRows ||
      []
    )
      .filter(
        row=>{
          const key =
            alertKeepKey(
              row.symbol,
              row.shape_id
            );

          return (
            key !==
            "::" &&
            !keepSet.has(
              key
            )
          );
        }
      )
      .map(
        row=>
        row.id
      );

  const deletedOrphans =
    await deletePriceAlertsByIds(
      orphanIds
    );

  const deletedEvents =
    await restDeleteCount(
      `price_alert_events?user_id=eq.${uid}`
    );

  invalidateTelegramAlertsReloadCache();

  return {
    deletedZombies,
    deletedSoft,
    deletedOrphans,
    deletedEvents,
    keptActive:
      keepSet.size
  };

}
