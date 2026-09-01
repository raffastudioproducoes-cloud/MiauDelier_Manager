export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase()
}
