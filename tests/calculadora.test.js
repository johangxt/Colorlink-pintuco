const { calcularGalones } = require('../src/services/calculadora');

describe('Calculadora de galones (unitaria)', () => {
  test('CP-01 calcula galones con 2 manos y 10% de desperdicio', () => {
    const r = calcularGalones({ metrosCuadrados: 50, manos: 2, rendimiento: 40, desperdicio: 0.1, precioGalon: 98000 });
    expect(r.galones_exactos).toBe(2.75);
    expect(r.galones).toBe(3);
    expect(r.costo_estimado).toBe(294000);
    expect(r.litros).toBeCloseTo(11.36, 2);
  });

  test('CP-02 redondea siempre hacia arriba', () => {
    expect(calcularGalones({ metrosCuadrados: 41, manos: 1, rendimiento: 40, desperdicio: 0 }).galones).toBe(2);
  });

  test('CP-03 un valor exacto no suma un galón extra', () => {
    expect(calcularGalones({ metrosCuadrados: 80, manos: 1, rendimiento: 40, desperdicio: 0 }).galones).toBe(2);
  });

  test('CP-04 mínimo 1 galón para áreas pequeñas', () => {
    expect(calcularGalones({ metrosCuadrados: 1, manos: 1, rendimiento: 40, desperdicio: 0 }).galones).toBe(1);
  });

  test('CP-05 más manos implica más pintura', () => {
    const una = calcularGalones({ metrosCuadrados: 100, manos: 1, rendimiento: 35 }).galones;
    const tres = calcularGalones({ metrosCuadrados: 100, manos: 3, rendimiento: 35 }).galones;
    expect(tres).toBeGreaterThan(una);
  });

  test.each([
    [{ metrosCuadrados: 0, rendimiento: 40 }, /metros cuadrados/],
    [{ metrosCuadrados: -5, rendimiento: 40 }, /metros cuadrados/],
    [{ metrosCuadrados: 'abc', rendimiento: 40 }, /metros cuadrados/],
    [{ metrosCuadrados: 200000, rendimiento: 40 }, /máxima/],
    [{ metrosCuadrados: 10, manos: 0, rendimiento: 40 }, /manos/],
    [{ metrosCuadrados: 10, manos: 6, rendimiento: 40 }, /manos/],
    [{ metrosCuadrados: 10, manos: 1.5, rendimiento: 40 }, /manos/],
    [{ metrosCuadrados: 10, rendimiento: 0 }, /rendimiento/],
  ])('CP-06 rechaza entradas inválidas %o', (entrada, msg) => {
    expect(() => calcularGalones(entrada)).toThrow(msg);
  });
});
