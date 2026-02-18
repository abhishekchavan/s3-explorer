import Store from 'electron-store'
import type { FavoriteBucket } from '@shared/types'

interface FavoriteStoreSchema {
  favorites: FavoriteBucket[]
}

const store = new Store<FavoriteStoreSchema>({
  name: 's3explorer-favorites',
  defaults: {
    favorites: []
  }
})

export function listFavorites(): FavoriteBucket[] {
  return store.get('favorites', [])
}

export function addFavorite(bucketName: string): FavoriteBucket {
  const favorites = store.get('favorites', [])

  const existing = favorites.find((f) => f.bucketName === bucketName)
  if (existing) {
    return existing
  }

  const newFavorite: FavoriteBucket = {
    bucketName,
    addedAt: Date.now()
  }

  favorites.push(newFavorite)
  store.set('favorites', favorites)

  return newFavorite
}

export function removeFavorite(bucketName: string): boolean {
  const favorites = store.get('favorites', [])
  const filtered = favorites.filter((f) => f.bucketName !== bucketName)

  if (filtered.length === favorites.length) {
    return false
  }

  store.set('favorites', filtered)
  return true
}
