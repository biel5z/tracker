import { z } from 'zod';

/**
 * Schemas Zod das respostas do TMDB.
 *
 * Validar a resposta de uma API externa evita que um campo inesperado
 * (null onde se esperava texto, por exemplo) quebre a interface lá na frente.
 * Se o TMDB mudar algo, o erro aparece aqui, num lugar só.
 *
 * Campos desconhecidos são descartados (comportamento padrão do z.object).
 */

const nullableString = z.string().nullish().transform((v) => v ?? null);

export const movieListItemSchema = z.object({
  id: z.number(),
  title: z.string().default(''),
  original_title: z.string().default(''),
  overview: z.string().default(''),
  poster_path: nullableString,
  backdrop_path: nullableString,
  release_date: z.string().optional(),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  genre_ids: z.array(z.number()).default([]),
});
export type RawMovieListItem = z.infer<typeof movieListItemSchema>;

export function pagedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    page: z.number(),
    total_pages: z.number(),
    total_results: z.number(),
    results: z.array(item),
  });
}

export const moviePageSchema = pagedSchema(movieListItemSchema);
export type RawMoviePage = z.infer<typeof moviePageSchema>;

export const genreListSchema = z.object({
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
});

const castSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string().nullish().transform((v) => v ?? ''),
  profile_path: nullableString,
  order: z.number().default(999),
});

const crewSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
  profile_path: nullableString,
});

const videoSchema = z.object({
  key: z.string(),
  name: z.string().default(''),
  site: z.string(),
  type: z.string(),
  iso_639_1: z.string().default(''),
  official: z.boolean().default(false),
});

const providerSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: nullableString,
});

const providerRegionSchema = z.object({
  link: nullableString,
  flatrate: z.array(providerSchema).default([]),
  rent: z.array(providerSchema).default([]),
  buy: z.array(providerSchema).default([]),
});

const releaseDatesResultsSchema = z
  .array(
    z.object({
      iso_3166_1: z.string(),
      release_dates: z.array(
        z.object({
          certification: z.string().default(''),
          release_date: z.string(),
          type: z.number(),
        }),
      ),
    }),
  )
  .default([]);

/** GET /movie/{id}/release_dates — datas de lançamento por país. */
export const releaseDatesSchema = z.object({ results: releaseDatesResultsSchema });

export const movieDetailSchema = movieListItemSchema.omit({ genre_ids: true }).extend({
  tagline: nullableString,
  runtime: z.number().nullish().transform((v) => v ?? null),
  status: z.string().default(''),
  imdb_id: nullableString,
  genres: z.array(z.object({ id: z.number(), name: z.string() })).default([]),
  credits: z
    .object({ cast: z.array(castSchema).default([]), crew: z.array(crewSchema).default([]) })
    .default({ cast: [], crew: [] }),
  videos: z.object({ results: z.array(videoSchema).default([]) }).default({ results: [] }),
  release_dates: z.object({ results: releaseDatesResultsSchema }).default({ results: [] }),
  'watch/providers': z
    .object({ results: z.record(z.string(), providerRegionSchema).default({}) })
    .default({ results: {} }),
  similar: moviePageSchema.optional(),
});
export type RawMovieDetail = z.infer<typeof movieDetailSchema>;

export const personSchema = z.object({
  id: z.number(),
  name: z.string(),
  biography: z.string().default(''),
  birthday: nullableString,
  deathday: nullableString,
  place_of_birth: nullableString,
  profile_path: nullableString,
  known_for_department: z.string().default(''),
  movie_credits: z
    .object({
      cast: z.array(
        movieListItemSchema.extend({
          character: z.string().nullish().transform((v) => v ?? ''),
        }),
      ),
    })
    .default({ cast: [] }),
  images: z
    .object({ profiles: z.array(z.object({ file_path: z.string() })).default([]) })
    .default({ profiles: [] }),
});
export type RawPerson = z.infer<typeof personSchema>;
