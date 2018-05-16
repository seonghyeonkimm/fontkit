import fontkit from '../src';
import assert from 'assert';
import concat from 'concat-stream';
import CFFFont from '../src/cff/CFFFont';
import r from 'restructure';
import CFFGlyph from '../src/glyph/CFFGlyph';
import fs from 'fs';

describe('font subsetting', function() {
  describe('truetype subsetting', function() {
    let font = fontkit.openSync(__dirname + '/data/OpenSans/OpenSans-Regular.ttf');

    it('should create a TTFSubset instance', function() {
      let subset = font.createSubset();
      assert.equal(subset.constructor.name, 'TTFSubset');
    });

    it('should produce a subset', function(done) {
      let subset = font.createSubset();
      for (let glyph of font.layout('hello').glyphs) {
        subset.includeGlyph(glyph);
      }

      subset.encodeStream().pipe(concat(function(buf) {
        let f = fontkit.create(buf);
        assert.equal(f.numGlyphs, 5);
        assert.equal(f.getGlyph(1).path.toSVG(), font.layout('h').glyphs[0].path.toSVG());
        done();
      }));
    });

    it('should re-encode variation glyphs', function(done) {
      if (!fs.existsSync('/Library/Fonts/Skia.ttf')) return done();

      let font = fontkit.openSync('/Library/Fonts/Skia.ttf', 'Bold');
      let subset = font.createSubset();
      for (let glyph of font.layout('e').glyphs) {
        subset.includeGlyph(glyph);
      }

      subset.encodeStream().pipe(concat(function(buf) {
        let f = fontkit.create(buf);
        assert.equal(f.getGlyph(1).path.toSVG(), font.layout('e').glyphs[0].path.toSVG());
        done();
      }));
    });

    it('should handle composite glyphs', function(done) {
      let subset = font.createSubset();
      subset.includeGlyph(font.layout('é').glyphs[0]);

      subset.encodeStream().pipe(concat(function(buf) {
        let f = fontkit.create(buf);
        assert.equal(f.numGlyphs, 4);
        assert.equal(f.getGlyph(1).path.toSVG(), font.layout('é').glyphs[0].path.toSVG());
        done();
      }));
    });
  });

  describe('CFF subsetting', function() {
    let font = fontkit.openSync(__dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf');

    it('should create a CFFSubset instance', function() {
      let subset = font.createSubset();
      return assert.equal(subset.constructor.name, 'CFFSubset');
    });

    it('should produce a subset', function(done) {
      let subset = font.createSubset();
      let iterable = font.layout('hello').glyphs;
      for (let i = 0; i < iterable.length; i++) {
        let glyph = iterable[i];
        subset.includeGlyph(glyph);
      }

      return subset.encodeStream().pipe(concat(function(buf) {
        let stream = new r.DecodeStream(buf);
        let cff = new CFFFont(stream);
        let glyph = new CFFGlyph(1, { stream, 'CFF ': cff });
        assert.equal(glyph.path.toSVG(), font.layout('h').glyphs[0].path.toSVG());
        return done();
      }));
    });

    it('should handle CID fonts', function(done) {
      let f = fontkit.openSync(__dirname + '/data/NotoSansCJK/NotoSansCJKkr-Regular.otf');
      let subset = f.createSubset();
      let iterable = f.layout('갈휸').glyphs;
      for (let i = 0; i < iterable.length; i++) {
        let glyph = iterable[i];
        subset.includeGlyph(glyph);
      }

      return subset.encodeStream().pipe(concat(function(buf) {
        let stream = new r.DecodeStream(buf);
        let cff = new CFFFont(stream);
        let glyph = new CFFGlyph(1, { stream, 'CFF ': cff });
        assert.equal(glyph.path.toSVG(), f.layout('갈').glyphs[0].path.toSVG());
        assert.equal(cff.topDict.FDArray.length, 2);
        assert.deepEqual(cff.topDict.FDSelect.fds, [0, 1, 1]);
        return done();
      }));
    });
  });
});
