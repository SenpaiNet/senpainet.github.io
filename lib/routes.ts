// ページの URL。GitHub Pages（静的な書き出し）では URL の途中に id を埋め込めないので、?id= で渡す。
export const questionHref = (id: string) => `/board/view?id=${encodeURIComponent(id)}`;
export const profileHref = (id: string) => `/profile/view?id=${encodeURIComponent(id)}`;
