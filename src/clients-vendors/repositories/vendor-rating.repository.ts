import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { VendorRating, RatingCategory } from '../entities/vendor-rating.entity';

/**
 * Vendor Rating Repository
 *
 * Custom repository methods for vendor rating queries.
 */
@Injectable()
export class VendorRatingRepository extends Repository<VendorRating> {
  constructor(private dataSource: DataSource) {
    super(VendorRating, dataSource.createEntityManager());
  }

  /**
   * Find ratings by vendor
   */
  async findByVendor(vendorId: number, category?: RatingCategory): Promise<VendorRating[]> {
    const query = this.createQueryBuilder('rating')
      .where('rating.vendorId = :vendorId', { vendorId })
      .orderBy('rating.ratingDate', 'DESC');

    if (category) {
      query.andWhere('rating.ratingCategory = :category', { category });
    }

    return query.getMany();
  }

  /**
   * Calculate average rating for vendor
   */
  async calculateAverageRating(vendorId: number, category?: RatingCategory): Promise<number> {
    const query = this.createQueryBuilder('rating')
      .select('AVG(rating.ratingValue)', 'avg')
      .where('rating.vendorId = :vendorId', { vendorId });

    if (category) {
      query.andWhere('rating.ratingCategory = :category', { category });
    }

    const result = await query.getRawOne();
    return result?.avg ? parseFloat(result.avg) : 0;
  }

  /**
   * Get rating statistics for vendor
   */
  async getRatingStatistics(vendorId: number): Promise<{
    total: number;
    average: number;
    byCategory: Record<string, { count: number; average: number }>;
  }> {
    const ratings = await this.findByVendor(vendorId);

    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.ratingValue, 0);
    const average = total > 0 ? sum / total : 0;

    const byCategory: Record<string, { count: number; sum: number }> = {};
    ratings.forEach((rating) => {
      const cat = rating.ratingCategory;
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, sum: 0 };
      }
      byCategory[cat].count++;
      byCategory[cat].sum += rating.ratingValue;
    });

    const byCategoryResult: Record<string, { count: number; average: number }> = {};
    Object.keys(byCategory).forEach((cat) => {
      const data = byCategory[cat];
      byCategoryResult[cat] = {
        count: data.count,
        average: data.count > 0 ? data.sum / data.count : 0,
      };
    });

    return {
      total,
      average: Math.round(average * 100) / 100,
      byCategory: byCategoryResult,
    };
  }
}
