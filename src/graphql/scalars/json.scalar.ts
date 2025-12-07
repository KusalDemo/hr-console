import { Scalar, CustomScalar } from '@nestjs/graphql';
import { ValueNode, Kind } from 'graphql';

@Scalar('JSON')
export class JSONScalar implements CustomScalar<any, any> {
  description = 'JSON custom scalar type';

  parseValue(value: any): any {
    return typeof value === 'object' ? value : JSON.parse(value);
  }

  serialize(value: any): any {
    return typeof value === 'object' ? value : JSON.parse(value);
  }

  parseLiteral(ast: ValueNode): any {
    if (ast.kind === Kind.OBJECT) {
      const value: any = {};
      ast.fields.forEach((field) => {
        value[field.name.value] = this.parseLiteral(field.value);
      });
      return value;
    }
    if (ast.kind === Kind.LIST) {
      return ast.values.map((v) => this.parseLiteral(v));
    }
    if (ast.kind === Kind.STRING || ast.kind === Kind.BOOLEAN) {
      return ast.value;
    }
    if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return Number(ast.value);
    }
    return null;
  }
}
